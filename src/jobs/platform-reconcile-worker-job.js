const ClusterControllerService = require('../services/cluster-controller-service')
const FogPlatformService = require('../services/fog-platform-service')
const ServicePlatformService = require('../services/service-platform-service')
const FogPlatformReconcileTaskManager = require('../data/managers/fog-platform-reconcile-task-manager')
const FogPlatformStatusManager = require('../data/managers/fog-platform-status-manager')
const ServicePlatformReconcileTaskManager = require('../data/managers/service-platform-reconcile-task-manager')
const ServiceManager = require('../data/managers/service-manager')
const Config = require('../config')
const logger = require('../logger')
const { runInTransaction, PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')

const scheduleTime = (Config.get('settings.fogPlatformReconcileWorkerIntervalSeconds', 3)) * 1000

async function run () {
  try {
    await processNextFogTask()
    await processNextServiceTask()
  } catch (error) {
    logger.error({ err: error, msg: 'Platform reconcile worker error' })
  } finally {
    setTimeout(run, scheduleTime)
  }
}

async function isFogDeleteReconcileTask (task, transaction) {
  if (task.reason === 'delete') {
    return true
  }
  const status = await FogPlatformStatusManager.getParsedStatus(task.fogUuid, transaction)
  return !!(status && status.phase === 'Deleting')
}

async function runFogReconcileForTask (task) {
  if (task.reason === 'delete') {
    return FogPlatformService.reconcileFogDelete(task.fogUuid)
  }

  const status = await runInTransaction(
    (transaction) => FogPlatformStatusManager.getParsedStatus(task.fogUuid, transaction),
    { priority: PRIORITY_BACKGROUND, label: 'platformReconcile.fogDeleteCheck' }
  )
  if (status && status.phase === 'Deleting') {
    return FogPlatformService.reconcileFogDelete(task.fogUuid)
  }

  const result = await FogPlatformService.reconcileFog(task.fogUuid)
  if (result && result.skipped && result.reason === 'deleting') {
    return FogPlatformService.reconcileFogDelete(task.fogUuid)
  }
  return result
}

async function processNextFogTask () {
  const uuid = ClusterControllerService.getCurrentControllerUuid()
  if (!uuid) {
    return
  }

  const stalenessSeconds = Config.get('settings.fogPlatformReconcileTaskStalenessSeconds', 300)
  let task
  try {
    task = await FogPlatformReconcileTaskManager.claimNextFogTask(uuid, stalenessSeconds)
  } catch (error) {
    logger.error({ err: error, msg: 'Fog platform reconcile task claim failed' })
    return
  }

  if (!task) {
    return
  }

  try {
    logger.info(`Fog platform reconcile task ${task.id} started`, {
      fogUuid: task.fogUuid,
      reason: task.reason
    })

    const result = await runFogReconcileForTask(task)

    logger.info(`Fog platform reconcile task ${task.id} completed`, {
      fogUuid: task.fogUuid,
      reason: task.reason,
      result
    })

    await runInTransaction(async (transaction) => {
      await FogPlatformReconcileTaskManager.getEntity().destroy({
        where: { id: task.id },
        transaction
      })
    }, { priority: PRIORITY_BACKGROUND, label: 'platformReconcile.fogTaskComplete' })
  } catch (error) {
    logger.error({
      err: error,
      msg: `Fog platform reconcile task ${task.id} failed`,
      fogUuid: task.fogUuid,
      reason: task.reason
    })
    try {
      await handleFogTaskFailure(task, error)
    } catch (failureError) {
      logger.error({
        err: failureError,
        msg: 'Fog platform reconcile failure recording failed',
        taskId: task.id,
        fogUuid: task.fogUuid
      })
    }
  }
}

async function processNextServiceTask () {
  const uuid = ClusterControllerService.getCurrentControllerUuid()
  if (!uuid) {
    return
  }

  const stalenessSeconds = Config.get('settings.fogPlatformReconcileTaskStalenessSeconds', 300)
  let task
  try {
    task = await ServicePlatformReconcileTaskManager.claimNextServiceTask(uuid, stalenessSeconds)
  } catch (error) {
    logger.error({ err: error, msg: 'Service platform reconcile task claim failed' })
    return
  }

  if (!task) {
    return
  }

  try {
    logger.info(`Service platform reconcile task ${task.id} started`, {
      serviceName: task.serviceName,
      reason: task.reason
    })

    const result = await ServicePlatformService.reconcileService(task.serviceName, task)

    logger.info(`Service platform reconcile task ${task.id} completed`, {
      serviceName: task.serviceName,
      reason: task.reason,
      result
    })

    if (task.reason !== 'delete') {
      await runInTransaction(async (transaction) => {
        await ServicePlatformReconcileTaskManager.getEntity().destroy({
          where: { id: task.id },
          transaction
        })
      }, { priority: PRIORITY_BACKGROUND, label: 'platformReconcile.serviceTaskComplete' })
    }
  } catch (error) {
    logger.error({
      err: error,
      msg: `Service platform reconcile task ${task.id} failed`,
      serviceName: task.serviceName,
      reason: task.reason
    })
    try {
      await handleServiceTaskFailure(task, error)
    } catch (failureError) {
      logger.error({
        err: failureError,
        msg: 'Service platform reconcile failure recording failed',
        taskId: task.id,
        serviceName: task.serviceName
      })
    }
  }
}

async function handleFogTaskFailure (task, error) {
  const errorMessage = error.message || String(error)

  await runInTransaction(async (transaction) => {
    await FogPlatformReconcileTaskManager.recordFogTaskFailure(
      task.id,
      errorMessage,
      { attempts: task.attempts },
      transaction
    )
    if (await isFogDeleteReconcileTask(task, transaction)) {
      await FogPlatformStatusManager.setPhase(task.fogUuid, 'Deleting', {
        lastError: errorMessage
      }, transaction)
    } else {
      await FogPlatformService.markReconcileFailed(task.fogUuid, error, transaction)
    }
  }, { priority: PRIORITY_BACKGROUND, label: 'platformReconcile.fogTaskFailure' })
}

async function handleServiceTaskFailure (task, error) {
  const errorMessage = error.message || String(error)
  const maxAttempts = Config.get('settings.servicePlatformReconcileMaxAttempts', 10)
  const nextAttempts = (task.attempts != null ? task.attempts : 0) + 1
  const isPermanent = nextAttempts >= maxAttempts

  await runInTransaction(async (transaction) => {
    await ServicePlatformReconcileTaskManager.recordServiceTaskFailure(
      task.id,
      errorMessage,
      { attempts: task.attempts },
      transaction
    )

    if (task.reason !== 'delete') {
      await ServiceManager.update(
        { name: task.serviceName },
        {
          provisioningStatus: isPermanent ? 'failed' : 'pending',
          provisioningError: errorMessage
        },
        transaction
      )
    }
  }, { priority: PRIORITY_BACKGROUND, label: 'platformReconcile.serviceTaskFailure' })
}

module.exports = {
  run,
  processNextFogTask,
  processNextServiceTask,
  runFogReconcileForTask,
  isFogDeleteReconcileTask
}
