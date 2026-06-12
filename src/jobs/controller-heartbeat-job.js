const ClusterControllerService = require('../services/cluster-controller-service')
const Config = require('../config')
const logger = require('../logger')

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

    const fakeTransaction = { fakeTransaction: true }
    await ClusterControllerService.updateHeartbeat(uuid, fakeTransaction)
    logger.debug(`Updated heartbeat for controller: ${uuid}`)
  } catch (error) {
    logger.error(`Failed to update controller heartbeat: ${error.message}`)
    throw error
  }
}

module.exports = {
  run
}
