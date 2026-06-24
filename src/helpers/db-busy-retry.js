const DEFAULT_MAX_RETRIES = 5

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

/**
 * Retry an async DB operation when SQLite reports SQLITE_BUSY (same semantics as TransactionDecorator queue retries).
 * No-op for non-SQLITE_BUSY errors. Safe on mysql/postgres — busy errors never match.
 */
async function withDbBusyRetry (fn, options = {}) {
  const maxRetries = options.maxRetries != null ? options.maxRetries : DEFAULT_MAX_RETRIES
  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= maxRetries || !isSqliteBusyError(error)) {
        throw error
      }
      attempt++
    }
  }
}

module.exports = {
  DEFAULT_MAX_RETRIES,
  isSqliteBusyError,
  withDbBusyRetry
}
