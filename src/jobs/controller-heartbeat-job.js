const ClusterControllerService = require('../services/cluster-controller-service')
const Config = require('../config')
const logger = require('../logger')
const { runInTransaction, PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')
const { checkSqliteFogCountWarning } = require('../helpers/sqlite-fog-warning')

const scheduleTime = (Config.get('settings.controllerHeartbeatInterval', 30)) * 1000

async function run () {
  try {
    await updateControllerHeartbeat()
  } catch (error) {
    logger.error('Error during controller heartbeat update:', error)
  } finally {
    setTimeout(run, scheduleTime)
  }
}

async function updateControllerHeartbeat () {
  try {
    const uuid = ClusterControllerService.getCurrentControllerUuid()
    if (!uuid) {
      logger.debug('Controller UUID not initialized yet, skipping heartbeat')
      return
    }

    await runInTransaction(
      (transaction) => ClusterControllerService.updateHeartbeat(uuid, transaction),
      { priority: PRIORITY_BACKGROUND, label: 'controller-heartbeat' }
    )
    await checkSqliteFogCountWarning()
    logger.debug(`Updated heartbeat for controller: ${uuid}`)
  } catch (error) {
    logger.error(`Failed to update controller heartbeat: ${error.message}`)
    throw error
  }
}

module.exports = {
  run
}
