const config = require('../config')
const models = require('../data/models')
const logger = require('../logger')
const transactionRunner = require('./transaction-runner')
const { recordSqliteFogCountWarning } = require('./db-metrics')

const DEFAULT_THRESHOLD = 50

function getThreshold () {
  return config.get('settings.sqliteEnterpriseFogWarningThreshold', DEFAULT_THRESHOLD)
}

/**
 * Log a soft warning when sqlite fleet size exceeds the enterprise threshold (R124).
 * Does not block API — observability and operator guidance only.
 */
async function checkSqliteFogCountWarning () {
  if (!transactionRunner.isSqliteProvider()) {
    return
  }

  const threshold = getThreshold()
  const fogCount = await models.Fog.count()
  if (fogCount <= threshold) {
    return
  }

  recordSqliteFogCountWarning()
  logger.warn(
    `SQLite deployment has ${fogCount} fogs (threshold ${threshold}). ` +
    'For enterprise scale and multi-user load, migrate to mysql or postgres. ' +
    'See docs/operations/database-transactions.md.'
  )
}

module.exports = {
  checkSqliteFogCountWarning,
  getThreshold
}
