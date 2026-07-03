const config = require('../config')
const dbMetrics = require('./db-metrics')

const DEFAULT_MAX_RETRIES = 5
const CONFIG_DEFAULT_MAX_RETRIES = 8
const CONFIG_DEFAULT_BASE_MS = 25

function isSqliteBusyError (error) {
  if (!error) {
    return false
  }
  const messages = [
    error.message,
    error.parent && error.parent.message,
    error.original && error.original.message
  ]
  return messages.some((message) => message && message.indexOf('SQLITE_BUSY') !== -1)
}

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRetryDefaults () {
  return {
    maxRetries: config.get('settings.dbBusyRetryMaxAttempts', CONFIG_DEFAULT_MAX_RETRIES),
    baseMs: config.get('settings.dbBusyRetryBaseMs', CONFIG_DEFAULT_BASE_MS)
  }
}

/**
 * Retry an async DB operation when SQLite reports SQLITE_BUSY (same semantics as TransactionDecorator queue retries).
 * No-op for non-SQLITE_BUSY errors. Safe on mysql/postgres — busy errors never match.
 */
async function withDbBusyRetry (fn, options = {}) {
  const defaults = getRetryDefaults()
  const maxRetries = options.maxRetries != null ? options.maxRetries : defaults.maxRetries
  const baseMs = options.baseMs != null ? options.baseMs : defaults.baseMs
  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= maxRetries || !isSqliteBusyError(error)) {
        throw error
      }
      attempt++
      dbMetrics.recordBusyRetry(options.label)
      const delayMs = baseMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * baseMs)
      await sleep(delayMs)
    }
  }
}

module.exports = {
  CONFIG_DEFAULT_BASE_MS,
  CONFIG_DEFAULT_MAX_RETRIES,
  DEFAULT_MAX_RETRIES,
  getRetryDefaults,
  isSqliteBusyError,
  withDbBusyRetry
}
