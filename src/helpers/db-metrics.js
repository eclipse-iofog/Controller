const { metrics } = require('@opentelemetry/api')

const METER_NAME = 'iofog-controller-db'
const METER_VERSION = '1.0.0'

let meter = null
let transactionDuration = null
let writeQueueWaitMs = null
let busyRetries = null
let connectionInvalidated = null
let sqliteFogCountWarning = null
let writeQueueDepthInteractive = null
let transactionTimeouts = null
let backgroundQueueShed = null

function getMeter () {
  if (!meter) {
    meter = metrics.getMeter(METER_NAME, METER_VERSION)
  }
  return meter
}

function isConnectionInvalidatedError (error) {
  if (!error) {
    return false
  }
  const messages = [
    error.message,
    error.parent && error.parent.message,
    error.original && error.original.message
  ]
  return messages.some((message) => message && (
    message.indexOf('cannot rollback') !== -1 ||
    message.indexOf('ConnectionManager.getConnection was called after') !== -1 ||
    message.indexOf('Connection terminated') !== -1 ||
    message.indexOf('Connection lost') !== -1 ||
    message.indexOf('ECONNRESET') !== -1 ||
    message.indexOf('ECONNREFUSED') !== -1
  ))
}

/**
 * Register DB OTEL instruments and optional Sequelize connection hooks.
 * @param {import('sequelize').Sequelize} [sequelize]
 * @param {string} provider
 * @param {{ getWriteQueueDepth?: () => { interactive: number, background: number } }} [queueReader]
 */
function initDbMetrics (_sequelize, _provider, queueReader) {
  const m = getMeter()

  transactionDuration = m.createHistogram('db.transaction.duration', {
    description: 'Sequelize transaction duration',
    unit: 'ms'
  })
  writeQueueWaitMs = m.createHistogram('db.write_queue.wait_ms', {
    description: 'Time spent waiting in the SQLite write queue before execution',
    unit: 'ms'
  })
  busyRetries = m.createCounter('db.busy_retries', {
    description: 'SQLite SQLITE_BUSY retries during transaction execution'
  })
  connectionInvalidated = m.createCounter('db.connection.invalidated', {
    description: 'Database connection errors indicating pool or transaction invalidation'
  })
  sqliteFogCountWarning = m.createCounter('db.sqlite.fog_count_warning', {
    description: 'SQLite fleet size exceeded enterprise recommended threshold'
  })

  if (queueReader && typeof queueReader.getWriteQueueDepth === 'function') {
    writeQueueDepthInteractive = m.createObservableGauge('db.write_queue.depth', {
      description: 'Pending SQLite write queue depth by priority lane'
    })
    writeQueueDepthInteractive.addCallback((result) => {
      const depth = queueReader.getWriteQueueDepth()
      result.observe(depth.interactive, { priority: 'interactive' })
      result.observe(depth.background, { priority: 'background' })
    })
  }

  transactionTimeouts = m.createCounter('db.transaction.timeouts', {
    description: 'SQLite transaction timeouts by label and priority lane'
  })
  backgroundQueueShed = m.createCounter('db.write_queue.background_shed', {
    description: 'Background SQLite write queue tasks shed during recovery surgery'
  })
}

function recordTransactionDuration (attributes, durationMs) {
  if (durationMs >= 0) {
    transactionDuration?.record(durationMs, attributes)
  }
}

function recordWriteQueueWaitMs (priority, waitMs) {
  if (waitMs >= 0) {
    writeQueueWaitMs?.record(waitMs, { priority })
  }
}

function recordBusyRetry (label) {
  busyRetries?.add(1, { label: label || 'unknown' })
}

function recordConnectionInvalidated (provider) {
  connectionInvalidated?.add(1, { provider: provider || 'unknown' })
}

function recordSqliteFogCountWarning () {
  sqliteFogCountWarning?.add(1)
}

function recordTransactionTimeout (label, priority) {
  transactionTimeouts?.add(1, {
    label: label || 'unknown',
    priority: priority || 'unknown'
  })
}

function recordBackgroundQueueShed (count, reason) {
  if (count > 0) {
    backgroundQueueShed?.add(count, { reason: reason || 'unknown' })
  }
}

function maybeRecordConnectionInvalidated (error, provider) {
  if (isConnectionInvalidatedError(error)) {
    recordConnectionInvalidated(provider)
  }
}

module.exports = {
  initDbMetrics,
  isConnectionInvalidatedError,
  maybeRecordConnectionInvalidated,
  recordBusyRetry,
  recordConnectionInvalidated,
  recordSqliteFogCountWarning,
  recordTransactionDuration,
  recordTransactionTimeout,
  recordBackgroundQueueShed,
  recordWriteQueueWaitMs
}
