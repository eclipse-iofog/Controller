const { Op } = require('sequelize')
const TransactionDecorator = require('../decorators/transaction-decorator')
const { PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')

const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const { microserviceState, microserviceExecState } = require('../enums/microservice-state')
const { zeroRuntimeMetrics } = require('../helpers/microservice-runtime-metrics')

const Config = require('../config')
const ApplicationManager = require('../data/managers/application-manager')
const logger = require('../logger')

const scheduleTime = Config.get('settings.fogStatusUpdateInterval') * 1000

const STALE_DESIRED_INACTIVE_STATUSES = new Set([
  microserviceState.DELETED,
  microserviceState.DELETING,
  microserviceState.RUNNING,
  microserviceState.STOPPING
])

let inFlight = false

function shouldForceObservedStopped (microservice) {
  const status = microservice.microserviceStatus && microservice.microserviceStatus.status
  return STALE_DESIRED_INACTIVE_STATUSES.has(status)
}

async function run () {
  if (inFlight) {
    return
  }
  inFlight = true
  try {
    await module.exports.runSafetyNetPass()
  } catch (error) {
    logger.error('Error during stopped application status update:', error)
  } finally {
    inFlight = false
    setTimeout(run, scheduleTime)
  }
}

async function runSafetyNetPass () {
  const updateStoppedApplicationMicroserviceStatus = TransactionDecorator.generateTransaction(
    updateApplicationMicroservices,
    { priority: PRIORITY_BACKGROUND, label: 'stoppedAppStatus.application' }
  )
  const updateStoppedMicroserviceStatus = TransactionDecorator.generateTransaction(
    updateDeactivatedMicroservices,
    { priority: PRIORITY_BACKGROUND, label: 'stoppedAppStatus.microservice' }
  )

  await updateStoppedApplicationMicroserviceStatus()
  await updateStoppedMicroserviceStatus()
}

async function updateApplicationMicroservices (transaction) {
  const stoppedApplications = await ApplicationManager.findAllWithAttributes({ isActivated: false }, ['id'], transaction)

  if (stoppedApplications.length === 0) {
    return
  }

  const applicationIds = stoppedApplications.map(app => app.id)
  const stoppedMicroservices = await MicroserviceManager.findAllWithStatuses({ applicationId: { [Op.in]: applicationIds } }, transaction)

  await updateMicroserviceStatusStopped(stoppedMicroservices, transaction)
}

async function updateDeactivatedMicroservices (transaction) {
  const activeApplications = await ApplicationManager.findAllWithAttributes({ isActivated: true }, ['id'], transaction)
  if (activeApplications.length === 0) {
    return
  }

  const activeApplicationIds = activeApplications.map(app => app.id)
  const stoppedMicroservices = await MicroserviceManager.findAllWithStatuses({
    isActivated: false,
    applicationId: { [Op.in]: activeApplicationIds }
  }, transaction)

  if (stoppedMicroservices.length === 0) {
    return
  }

  await updateMicroserviceStatusStopped(stoppedMicroservices, transaction)
}

async function updateMicroserviceStatusStopped (stoppedMicroservices, transaction) {
  const toStop = (stoppedMicroservices || []).filter(shouldForceObservedStopped)
  const microserviceStatusIds = toStop.map((microservice) => microservice.microserviceStatus.id)
  const microserviceExecStatusIds = toStop
    .filter((microservice) => microservice.microserviceExecStatus)
    .map((microservice) => microservice.microserviceExecStatus.id)

  if (microserviceStatusIds.length) {
    await MicroserviceStatusManager.update(
      { id: microserviceStatusIds },
      Object.assign({ status: microserviceState.STOPPED }, zeroRuntimeMetrics()),
      transaction
    )
  }
  if (microserviceExecStatusIds.length) {
    await MicroserviceExecStatusManager.update(
      { id: microserviceExecStatusIds },
      { execSessionId: '', status: microserviceExecState.INACTIVE },
      transaction
    )
  }
  return toStop
}

module.exports = {
  run,
  runSafetyNetPass,
  updateApplicationMicroservices,
  updateDeactivatedMicroservices,
  updateMicroserviceStatusStopped,
  shouldForceObservedStopped
}
