const { AsyncLocalStorage } = require('async_hooks')
const databaseProvider = require('../data/providers/database-factory')
const config = require('../config')
const logger = require('../logger')
const { withDbBusyRetry } = require('./db-busy-retry')
const {
  maybeRecordConnectionInvalidated,
  recordTransactionDuration,
  recordWriteQueueWaitMs
} = require('./db-metrics')

const PRIORITY_INTERACTIVE = 'interactive'
const PRIORITY_BACKGROUND = 'background'

const interactiveLane = []
const backgroundLane = []
let workerPromise = null
let queueDepthExceededLogged = false
const activeTransactionStore = new AsyncLocalStorage()

const queueDepth = {
  interactive: 0,
  background: 0
}

function getProviderName () {
  return process.env.DB_PROVIDER || config.get('database.provider', 'sqlite') || 'sqlite'
}

function isSqliteProvider () {
  return getProviderName() === 'sqlite'
}

function getWriteQueueMaxDepth () {
  return config.get('settings.dbWriteQueueMaxDepth', 256)
}

function updateQueueDepth () {
  queueDepth.interactive = interactiveLane.length
  queueDepth.background = backgroundLane.length
}

function getWriteQueueDepth () {
  return { ...queueDepth }
}

function checkQueueBackpressure () {
  const depth = getWriteQueueDepth()
  const totalDepth = depth.interactive + depth.background
  const maxDepth = getWriteQueueMaxDepth()
  if (totalDepth <= maxDepth) {
    queueDepthExceededLogged = false
    return
  }
  if (!queueDepthExceededLogged) {
    queueDepthExceededLogged = true
    logger.error(
      `SQLite write queue depth ${totalDepth} exceeds configured maximum ${maxDepth} ` +
      `(interactive=${depth.interactive}, background=${depth.background}). ` +
      'Investigate background job pressure or migrate to mysql/postgres. ' +
      'Interactive requests are not rejected; see docs/operations/database-transactions.md.'
    )
  }
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

  try {
    const result = await withDbBusyRetry(
      () => sequelize.transaction((transaction) => {
        return activeTransactionStore.run({ transaction, priority }, async () => fn(transaction))
      }),
      options
    )
    recordTransactionDuration(
      {
        label: options.label || 'unknown',
        priority: options.priority || PRIORITY_INTERACTIVE,
        provider
      },
      Date.now() - startedAt
    )
    return result
  } catch (error) {
    maybeRecordConnectionInvalidated(error, provider)
    throw error
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
  return new Promise((resolve, reject) => {
    const item = {
      fn,
      resolve,
      reject,
      priority: options.priority,
      enqueuedAt: Date.now(),
      retryOptions: {
        label: options.label,
        priority: options.priority
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
    priority: options.priority || PRIORITY_INTERACTIVE
  })
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
 * @param {{ priority?: string, label?: string }} [options]
 */
async function runInTransaction (fn, options = {}) {
  const priority = options.priority || PRIORITY_INTERACTIVE
  const label = options.label || 'unknown'

  if (isSqliteProvider()) {
    const parentCtx = getActiveTransactionContext()
    if (parentCtx && parentCtx.transaction && priority !== PRIORITY_BACKGROUND) {
      return fn(parentCtx.transaction)
    }
    return enqueueSqlite(fn, { priority, label })
  }

  return runInTransactionPool(fn, { priority, label })
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
    await runInTransaction(fn, { priority: PRIORITY_BACKGROUND, label })
  })
}

function _resetQueueForTests () {
  interactiveLane.length = 0
  backgroundLane.length = 0
  workerPromise = null
  queueDepth.interactive = 0
  queueDepth.background = 0
  queueDepthExceededLogged = false
}

module.exports = {
  PRIORITY_BACKGROUND,
  PRIORITY_INTERACTIVE,
  _resetQueueForTests,
  getActiveTransaction,
  getActiveTransactionContext,
  getProviderName,
  getWriteQueueDepth,
  getWriteQueueMaxDepth,
  isSqliteProvider,
  runInTransaction,
  runWithTransactionContext,
  schedulePostCommitBackground
}
