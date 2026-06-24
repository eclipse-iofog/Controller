const ClusterControllerService = require('../services/cluster-controller-service')
const NatsService = require('../services/nats-service')
const NatsReconcileTaskManager = require('../data/managers/nats-reconcile-task-manager')
const databaseProvider = require('../data/providers/database-factory')
const Config = require('../config')
const logger = require('../logger')

const scheduleTime = (Config.get('settings.natsReconcileWorkerIntervalSeconds', 3)) * 1000

async function run () {
  try {
    await processNextTask()
  } catch (error) {
    logger.error({ err: error, msg: 'NATS reconcile worker error' })
  } finally {
    setTimeout(run, scheduleTime)
  }
}

async function processNextTask () {
  const uuid = ClusterControllerService.getCurrentControllerUuid()
  if (!uuid) {
    return
  }

  let task
  try {
    task = await NatsService.claimNextTask(uuid)
  } catch (error) {
    logger.error({ err: error, msg: 'NATS reconcile task claim failed' })
    return
  }

  if (!task) {
    return
  }

  const fogUuids = task.fogUuids
    ? task.fogUuids.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined
  const options = {
    reason: task.reason,
    applicationId: task.applicationId,
    accountRuleId: task.accountRuleId,
    userRuleId: task.userRuleId,
    fogUuids: fogUuids && fogUuids.length > 0 ? fogUuids : undefined
  }

  try {
    logger.info(`NATS reconcile task ${task.id} started`)
    await NatsService.reconcileResolverArtifacts(options)
    logger.info(`NATS reconcile task ${task.id} completed`)
    await databaseProvider.sequelize.transaction(async (transaction) => {
      await NatsReconcileTaskManager.getEntity().destroy({
        where: { id: task.id },
        transaction
      })
    })
  } catch (error) {
    logger.error({
      err: error,
      msg: `NATS reconcile task ${task.id} failed; task will be reclaimed after staleness`,
      taskId: task.id,
      reason: task.reason
    })
  }
}

module.exports = {
  run
}
