const FogUsedTokenManager = require('../data/managers/fog-used-token-manager')
const Config = require('../config')
const logger = require('../logger')
const { runInTransaction, PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')

const scheduleTime = Config.get('settings.fogExpiredTokenCleanupInterval') * 1000

async function run () {
  try {
    await cleanupExpiredTokens()
  } catch (error) {
    logger.error({ err: error }, 'Error during JTI cleanup')
  } finally {
    setTimeout(run, scheduleTime)
  }
}

async function cleanupExpiredTokens () {
  try {
    logger.debug('Starting cleanup of expired JTIs')
    const count = await runInTransaction(
      (transaction) => FogUsedTokenManager.cleanupExpiredJtis(transaction),
      { priority: PRIORITY_BACKGROUND, label: 'fogToken.cleanupExpiredJtis' }
    )
    logger.debug(`Cleaned up ${count} expired JTIs`)
  } catch (error) {
    logger.error({ err: error }, 'Error during JTI cleanup')
  }
}

module.exports = {
  run
}
