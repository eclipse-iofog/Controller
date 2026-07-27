const { AsyncLocalStorage } = require('async_hooks')
const databaseProvider = require('../data/providers/database-factory')
const config = require('../config')
const logger = require('../logger')
const { withDbBusyRetry } = require('./db-busy-retry')
const { TransactionTimeoutError, QueueBackpressureError } = require('./errors')
const {
  maybeRecordConnectionInvalidated,
  recordTransactionDuration,
  recordWriteQueueWaitMs,
  recordTransactionTimeout,
  recordBackgroundQueueShed
} = require('./db-metrics')

const PRIORITY_INTERACTIVE = 'interactive'
const PRIORITY_BACKGROUND = 'background'

const READINESS_LABEL = 'readiness.database'

const interactiveLane = []
const backgroundLane = []
let workerPromise = null
let queueDepthExceededLogged = false
let backpressureActiveSince = null
const activeTransactionStore = new AsyncLocalStorage()

const interactiveTimeoutTimestamps = []

const queueDepth = {
  interactive: 0,
  background: 0
}

const SURGERY_INTERACTIVE_TIMEOUT_THRESHOLD = 3
const SURGERY_INTERACTIVE_TIMEOUT_WINDOW_MS = 60000
const SURGERY_BACKPRESSURE_SUSTAINED_MS = 30000

function getProviderName () {
  return process.env.DB_PROVIDER || config.get('database.provider', 'sqlite') || 'sqlite'
}

function isSqliteProvider () {
  return getProviderName() === 'sqlite'
}

function getWriteQueueMaxDepth () {
  return config.get('settings.dbWriteQueueMaxDepth', 256)
}

function getWriteQueueBackpressureDepth () {
  return config.get('settings.dbWriteQueueBackpressureDepth', 32)
}

function getTransactionTimeoutMs (options = {}) {
  if (options.timeoutMs != null) {
    return options.timeoutMs
  }

  if (options.label === READINESS_LABEL) {
    return config.get('settings.dbTransactionTimeoutReadinessMs', 5000)
  }

  const priority = options.priority || PRIORITY_INTERACTIVE
  if (priority === PRIORITY_BACKGROUND) {
    return config.get('settings.dbTransactionTimeoutBackgroundMs', 120000)
  }

  return config.get('settings.dbTransactionTimeoutInteractiveMs', 15000)
}

function updateQueueDepth () {
  queueDepth.interactive = interactiveLane.length
  queueDepth.background = backgroundLane.length
}

function getWriteQueueDepth () {
  return { ...queueDepth }
}

function getTotalQueueDepth () {
  return queueDepth.interactive + queueDepth.background
}

function isBackpressureActive () {
  return getTotalQueueDepth() > getWriteQueueBackpressureDepth()
}

function trackBackpressureState () {
  if (isBackpressureActive()) {
    if (!backpressureActiveSince) {
      backpressureActiveSince = Date.now()
    }
    return
  }
  backpressureActiveSince = null
}

function checkQueueBackpressure () {
  const depth = getWriteQueueDepth()
  const totalDepth = depth.interactive + depth.background
  const maxDepth = getWriteQueueMaxDepth()
  trackBackpressureState()

  if (totalDepth <= maxDepth) {
    queueDepthExceededLogged = false
  } else if (!queueDepthExceededLogged) {
    queueDepthExceededLogged = true
    logger.error(
      `SQLite write queue depth ${totalDepth} exceeds configured maximum ${maxDepth} ` +
      `(interactive=${depth.interactive}, background=${depth.background}). ` +
      'Investigate background job pressure or migrate to mysql/postgres. ' +
      'Interactive requests are not rejected; see docs/operations/database-transactions.md.'
    )
  }

  maybePerformQueueSurgery('sustained-backpressure')
}

function withTransactionTimeout (promise, options = {}) {
  const timeoutMs = getTransactionTimeoutMs(options)
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TransactionTimeoutError(options.label, options.priority, timeoutMs))
    }, timeoutMs)

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

async function recoverSqliteConnection () {
  if (!isSqliteProvider()) {
    return
  }

  const sequelize = databaseProvider.sequelize
  const connectionManager = sequelize && sequelize.connectionManager
  if (!connectionManager) {
    return
  }

  try {
    if (connectionManager.pool) {
      await connectionManager.pool.drain()
      await connectionManager.pool.destroyAllNow()
    }
  } catch (error) {
    logger.warn({ err: error.message }, 'SQLite pool drain during recovery failed')
  }

  try {
    connectionManager.initPools()
    await sequelize.authenticate()
  } catch (error) {
    logger.error({ err: error.message }, 'SQLite connection pool re-init failed after recovery')
    throw error
  }
}

function recordInteractiveTimeoutForSurgery () {
  const now = Date.now()
  interactiveTimeoutTimestamps.push(now)
  while (
    interactiveTimeoutTimestamps.length > 0 &&
    now - interactiveTimeoutTimestamps[0] > SURGERY_INTERACTIVE_TIMEOUT_WINDOW_MS
  ) {
    interactiveTimeoutTimestamps.shift()
  }
}

function maybePerformQueueSurgery (reason) {
  if (!isSqliteProvider()) {
    return 0
  }

  let shouldShed = false

  if (reason === 'interactive-timeout') {
    shouldShed = interactiveTimeoutTimestamps.length >= SURGERY_INTERACTIVE_TIMEOUT_THRESHOLD
  } else if (reason === 'sustained-backpressure') {
    shouldShed = backpressureActiveSince != null &&
      Date.now() - backpressureActiveSince >= SURGERY_BACKPRESSURE_SUSTAINED_MS
  }

  if (!shouldShed || backgroundLane.length === 0) {
    return 0
  }

  return shedBackgroundLane(reason)
}

function shedBackgroundLane (reason) {
  const dropped = backgroundLane.splice(0, backgroundLane.length)
  updateQueueDepth()
  trackBackpressureState()

  for (const item of dropped) {
    item.reject(new QueueBackpressureError(`SQLite background queue shed (${reason})`))
  }

  if (dropped.length > 0) {
    recordBackgroundQueueShed(dropped.length, reason)
    logger.error(
      `SQLite write queue surgery: shed ${dropped.length} background task(s) (${reason}); ` +
      `interactiveQueued=${queueDepth.interactive}`
    )
  }

  return dropped.length
}

async function handleTransactionFailure (error, options) {
  if (error instanceof TransactionTimeoutError) {
    recordTransactionTimeout(options.label, options.priority)
    logger.error({
      msg: 'SQLite transaction timed out',
      label: options.label,
      priority: options.priority,
      timeoutMs: error.timeoutMs
    })

    if (isSqliteProvider()) {
      try {
        await recoverSqliteConnection()
      } catch (recoveryError) {
        logger.error({ err: recoveryError.message }, 'SQLite connection recovery failed after transaction timeout')
      }

      if (options.priority === PRIORITY_INTERACTIVE) {
        recordInteractiveTimeoutForSurgery()
        maybePerformQueueSurgery('interactive-timeout')
      }
    }
  }

  throw error
}

function dequeueNext () {
  if (interactiveLane.length > 0) {
    return interactiveLane.shift()
  }
  if (backgroundLane.length > 0) {
    return backgroundLane.shift()
  }
  return null
}

function getActiveTransactionContext () {
  return activeTransactionStore.getStore() || null
}

function getActiveTransaction () {
  const ctx = getActiveTransactionContext()
  return ctx ? ctx.transaction : null
}

async function executeTransaction (fn, options) {
  const sequelize = databaseProvider.sequelize
  const provider = getProviderName()
  const startedAt = Date.now()
  const priority = options.priority || PRIORITY_INTERACTIVE
  const label = options.label || 'unknown'

  try {
    const result = await withTransactionTimeout(
      withDbBusyRetry(
        () => sequelize.transaction((transaction) => {
          return activeTransactionStore.run({ transaction, priority }, async () => fn(transaction))
        }),
        options
      ),
      { priority, label, timeoutMs: options.timeoutMs }
    )
    recordTransactionDuration(
      {
        label,
        priority,
        provider
      },
      Date.now() - startedAt
    )
    return result
  } catch (error) {
    maybeRecordConnectionInvalidated(error, provider)
    return handleTransactionFailure(error, { priority, label, timeoutMs: options.timeoutMs })
  }
}

async function runWorker () {
  while (true) {
    updateQueueDepth()
    checkQueueBackpressure()
    const item = dequeueNext()
    if (!item) {
      break
    }

    recordWriteQueueWaitMs(item.priority, Date.now() - item.enqueuedAt)

    try {
      const result = await executeTransaction(item.fn, item.retryOptions)
      item.resolve(result)
    } catch (error) {
      item.reject(error)
    }
  }
  workerPromise = null
}

function ensureWorker () {
  if (!workerPromise) {
    workerPromise = runWorker()
  }
  return workerPromise
}

function enqueueSqlite (fn, options) {
  if (options.priority === PRIORITY_BACKGROUND && isBackpressureActive()) {
    return Promise.reject(new QueueBackpressureError('SQLite background enqueue rejected due to queue backpressure'))
  }

  return new Promise((resolve, reject) => {
    const item = {
      fn,
      resolve,
      reject,
      priority: options.priority,
      enqueuedAt: Date.now(),
      retryOptions: {
        label: options.label,
        priority: options.priority,
        timeoutMs: options.timeoutMs
      }
    }

    if (options.priority === PRIORITY_BACKGROUND) {
      backgroundLane.push(item)
    } else {
      interactiveLane.push(item)
    }

    updateQueueDepth()
    checkQueueBackpressure()
    ensureWorker()
  })
}

async function runInTransactionPool (fn, options) {
  return executeTransaction(fn, {
    label: options.label,
    priority: options.priority || PRIORITY_INTERACTIVE,
    timeoutMs: options.timeoutMs
  })
}

/**
 * Run a lightweight SQLite read outside the global write queue (WAL-safe).
 * Used for readiness probes so health checks do not sit behind stuck writers.
 */
async function runSqliteReadOutsideQueue (fn, options = {}) {
  if (!isSqliteProvider()) {
    return fn()
  }

  const label = options.label || READINESS_LABEL
  const priority = options.priority || PRIORITY_INTERACTIVE
  const timeoutMs = getTransactionTimeoutMs({ ...options, label })

  try {
    return await withTransactionTimeout(Promise.resolve().then(fn), {
      label,
      priority,
      timeoutMs
    })
  } catch (error) {
    return handleTransactionFailure(error, { label, priority, timeoutMs })
  }
}

/**
 * Run a callback inside a real Sequelize transaction.
 * SQLite: serialized through a global priority write queue (interactive before background).
 * mysql/postgres: direct pool transaction, no global queue.
 *
 * On SQLite, interactive priority reuses an active ALS parent transaction when nested.
 * Background priority always enqueues a fresh transaction so deferred work (e.g. audit
 * events scheduled via setImmediate after a handler commit) cannot reuse a stale tx.
 *
 * @param {Function} fn - async (transaction) => result
 * @param {{ priority?: string, label?: string, timeoutMs?: number }} [options]
 */
async function runInTransaction (fn, options = {}) {
  const priority = options.priority || PRIORITY_INTERACTIVE
  const label = options.label || 'unknown'

  if (isSqliteProvider()) {
    const parentCtx = getActiveTransactionContext()
    if (parentCtx && parentCtx.transaction && priority !== PRIORITY_BACKGROUND) {
      return fn(parentCtx.transaction)
    }
    return enqueueSqlite(fn, { priority, label, timeoutMs: options.timeoutMs })
  }

  return runInTransactionPool(fn, { priority, label, timeoutMs: options.timeoutMs })
}

/**
 * Run a callback with an existing Sequelize transaction registered in AsyncLocalStorage.
 * Use whenever executing code that already holds a transaction outside executeTransaction's
 * own ALS frame (e.g. generateTransaction explicit-tx and ALS-inject paths).
 *
 * @param {object} transaction - Sequelize transaction
 * @param {string|undefined} priority - Lane priority; inherits from parent ALS when omitted
 * @param {Function} fn - async (transaction) => result
 */
async function runWithTransactionContext (transaction, priority, fn) {
  const parentCtx = getActiveTransactionContext()
  const effectivePriority = priority ?? parentCtx?.priority ?? PRIORITY_INTERACTIVE
  if (parentCtx?.transaction === transaction) {
    return fn(transaction)
  }
  return activeTransactionStore.run({ transaction, priority: effectivePriority }, () => fn(transaction))
}

/**
 * Defer work until after the current API tick so a committed ALS parent tx cannot
 * be reused. Always runs fn inside a fresh PRIORITY_BACKGROUND transaction (R138).
 *
 * @param {string} label - transaction-runner label for metrics/logging
 * @param {Function} fn - async (transaction) => result
 */
function schedulePostCommitBackground (label, fn) {
  setImmediate(async () => {
    try {
      await runInTransaction(fn, { priority: PRIORITY_BACKGROUND, label })
    } catch (error) {
      if (error instanceof QueueBackpressureError) {
        logger.warn({ msg: 'Deferred background transaction rejected by queue backpressure', label })
        return
      }
      logger.error({ err: error, msg: 'Deferred background transaction failed', label })
    }
  })
}

function _resetQueueForTests () {
  interactiveLane.length = 0
  backgroundLane.length = 0
  workerPromise = null
  queueDepth.interactive = 0
  queueDepth.background = 0
  queueDepthExceededLogged = false
  backpressureActiveSince = null
  interactiveTimeoutTimestamps.length = 0
}

module.exports = {
  PRIORITY_BACKGROUND,
  PRIORITY_INTERACTIVE,
  READINESS_LABEL,
  _resetQueueForTests,
  getActiveTransaction,
  getActiveTransactionContext,
  getProviderName,
  getWriteQueueBackpressureDepth,
  getWriteQueueDepth,
  getWriteQueueMaxDepth,
  getTransactionTimeoutMs,
  isSqliteProvider,
  runInTransaction,
  runSqliteReadOutsideQueue,
  runWithTransactionContext,
  schedulePostCommitBackground,
  shedBackgroundLane
}
