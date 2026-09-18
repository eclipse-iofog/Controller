const { Op } = require('sequelize')
const TransactionDecorator = require('../decorators/transaction-decorator')
const { PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')

const FogManager = require('../data/managers/iofog-manager')
const ApplicationManager = require('../data/managers/application-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const { microserviceState, microserviceExecState } = require('../enums/microservice-state')
const FogStates = require('../enums/fog-state')
const { zeroRuntimeMetrics } = require('../helpers/microservice-runtime-metrics')
const Config = require('../config')
const logger = require('../logger')

const MIN_FOG_STATUS_FREQUENCY_SEC = 10
const LIVENESS_DAEMON_STATUSES = [FogStates.RUNNING, FogStates.WARNING]
const scheduleTime = Config.get('settings.fogStatusUpdateInterval') * 1000

let inFlight = false

function clampedStatusFrequencySec (statusFrequency) {
  const numeric = Number(statusFrequency)
  const freqSec = Number.isFinite(numeric) ? numeric : 0
  return Math.max(freqSec, MIN_FOG_STATUS_FREQUENCY_SEC)
}

function isFogStatusStale (fog, tolerance, nowMs) {
  const deadlineMs = fog.lastStatusTime + clampedStatusFrequencySec(fog.statusFrequency) * 1000 * tolerance
  return nowMs > deadlineMs
}

function isDesiredInactive (microservice, application) {
  return microservice.isActivated === false || (application && application.isActivated === false)
}

function shouldMarkUnknownOnQuietFog (microservice, application) {
  if (!microservice.microserviceStatus) {
    return false
  }
  if (isDesiredInactive(microservice, application)) {
    return false
  }
  return true
}

async function run () {
  if (inFlight) {
    return
  }
  inFlight = true
  try {
    await module.exports.runLivenessPass()
  } catch (error) {
    logger.error('Error during fog status update:', error)
  } finally {
    inFlight = false
    setTimeout(run, scheduleTime)
  }
}

async function runLivenessPass () {
  const chunkSize = Math.max(1, Number(Config.get('settings.fogStatusLivenessChunkSize', 50)) || 50)
  const tolerance = Config.get('settings.fogStatusUpdateTolerance')
  const processChunk = TransactionDecorator.generateTransaction(
    processLivenessChunk,
    { priority: PRIORITY_BACKGROUND, label: 'fogStatus.updateConnection' }
  )

  let afterUuid = null
  while (true) {
    const result = await processChunk(afterUuid, chunkSize, tolerance)
    if (!result || !result.nextCursor) {
      break
    }
    afterUuid = result.nextCursor
  }
}

async function processLivenessChunk (afterUuid, chunkSize, tolerance, transaction) {
  const nowMs = Date.now()
  const heardBefore = nowMs - MIN_FOG_STATUS_FREQUENCY_SEC * 1000 * tolerance
  const candidates = await FogManager.findStatusLivenessCandidates({
    afterUuid,
    limit: chunkSize,
    heardBefore,
    daemonStatuses: LIVENESS_DAEMON_STATUSES
  }, transaction)

  if (!candidates.length) {
    return { nextCursor: null, staleCount: 0 }
  }

  const nextCursor = candidates[candidates.length - 1].uuid
  const staleFogs = candidates.filter((fog) => isFogStatusStale(fog, tolerance, nowMs))
  if (!staleFogs.length) {
    return { nextCursor, staleCount: 0 }
  }

  const unknownFogUuids = staleFogs.map((fog) => fog.uuid)
  await FogManager.update({ uuid: unknownFogUuids }, { daemonStatus: FogStates.UNKNOWN }, transaction)
  await markDesiredActiveUnknown(unknownFogUuids, transaction)
  return { nextCursor, staleCount: staleFogs.length }
}

async function markDesiredActiveUnknown (unknownFogUuids, transaction) {
  if (!unknownFogUuids.length) {
    return
  }

  const microservices = await MicroserviceManager.findAllWithStatuses({
    iofogUuid: { [Op.in]: unknownFogUuids }
  }, transaction)
  if (!microservices.length) {
    return
  }

  const applicationIds = [...new Set(microservices.map((ms) => ms.applicationId).filter((id) => id != null))]
  const applications = applicationIds.length
    ? await ApplicationManager.findAll({ id: applicationIds }, transaction)
    : []
  const applicationById = new Map((applications || []).map((app) => [app.id, app]))

  const statusIds = []
  const execIds = []
  for (const microservice of microservices) {
    const application = applicationById.get(microservice.applicationId)
    if (!shouldMarkUnknownOnQuietFog(microservice, application)) {
      continue
    }
    statusIds.push(microservice.microserviceStatus.id)
    if (microservice.microserviceExecStatus) {
      execIds.push(microservice.microserviceExecStatus.id)
    }
  }

  if (statusIds.length) {
    await MicroserviceStatusManager.update(
      { id: statusIds },
      Object.assign({ status: microserviceState.UNKNOWN }, zeroRuntimeMetrics()),
      transaction
    )
  }
  if (execIds.length) {
    await MicroserviceExecStatusManager.update(
      { id: execIds },
      { execSessionId: '', status: microserviceExecState.INACTIVE },
      transaction
    )
  }
}

module.exports = {
  run,
  runLivenessPass,
  processLivenessChunk,
  isFogStatusStale,
  shouldMarkUnknownOnQuietFog,
  clampedStatusFrequencySec,
  MIN_FOG_STATUS_FREQUENCY_SEC
}
