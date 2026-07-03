const ClusterControllerManager = require('../data/managers/cluster-controller-manager')
const Config = require('../config')
const logger = require('../logger')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const { runInTransaction, PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')

async function run () {
  try {
    await cleanupInactiveControllers()
  } catch (error) {
    logger.error('Error during controller cleanup:', error)
  } finally {
    const currentInterval = process.env.CONTROLLER_CLEANUP_INTERVAL || Config.get('settings.controllerCleanupInterval', 600)
    setTimeout(run, currentInterval * 1000)
  }
}

async function cleanupInactiveControllers () {
  try {
    const thresholdSeconds = process.env.CONTROLLER_INACTIVE_THRESHOLD || Config.get('settings.controllerInactiveThreshold', 300)
    const threshold = new Date(Date.now() - thresholdSeconds * 1000)

    logger.debug(`Starting cleanup of controllers inactive for more than ${thresholdSeconds} seconds`)

    const cleanedCount = await runInTransaction(async (transaction) => {
      const inactive = await ClusterControllerManager.findAll({
        isActive: true,
        lastHeartbeat: { [Op.lt]: threshold }
      }, transaction)

      let count = 0
      for (const controller of inactive) {
        await ClusterControllerManager.update(
          { uuid: controller.uuid },
          { isActive: false },
          transaction
        )
        logger.info(`Marked controller ${controller.uuid} on host ${controller.host} as inactive (last heartbeat: ${controller.lastHeartbeat})`)
        count++
      }
      return count
    }, { priority: PRIORITY_BACKGROUND, label: 'controller-cleanup' })

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} inactive controller(s)`)
    } else {
      logger.debug('No inactive controllers to clean up')
    }

    return cleanedCount
  } catch (error) {
    logger.error('Error during controller cleanup:', error)
    throw error
  }
}

module.exports = {
  run
}
