const Config = require('../config')
const logger = require('../logger')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const WebSocketServer = require('../websocket/server')
const MicroserviceExecSessionManager = require('../data/managers/microservice-exec-session-manager')
const MicroserviceLogStatusManager = require('../data/managers/microservice-log-status-manager')
const FogLogStatusManager = require('../data/managers/fog-log-status-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const ChangeTrackingService = require('../services/change-tracking-service')
const FogManager = require('../data/managers/iofog-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const { PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')

function getIntervalMs () {
  const seconds = process.env.WS_SESSION_RECONCILE_INTERVAL_SECONDS ||
    Config.get('settings.wsSessionReconcileIntervalSeconds', 60)
  return seconds * 1000
}

function getSessionConfig () {
  return Config.get('server.webSocket.session') || {}
}

async function run () {
  try {
    await reconcileStaleSessions()
  } catch (error) {
    logger.error('Error during WS session reconcile:', error)
  } finally {
    setTimeout(run, getIntervalMs())
  }
}

async function reconcileStaleSessionsInTransaction (transaction) {
  const wsServer = WebSocketServer.getInstance()
  const execSessionManager = wsServer.execSessionManager
  const logSessionManager = wsServer.logSessionManager
  const sessionConfig = getSessionConfig()
  const execPendingTimeout = sessionConfig.execPendingTimeoutMs || 60000
  const execMaxDuration = sessionConfig.execMaxDurationMs || 28800000
  const logPendingTimeout = sessionConfig.logPendingTimeoutMs || 120000
  const logIdleTimeout = sessionConfig.logIdleTimeoutMs || 7200000
  const now = Date.now()

  let execCleaned = 0
  let logCleaned = 0

  const execRows = await MicroserviceExecSessionManager.findAll({
    status: { [Op.in]: ['PENDING', 'ACTIVE'] }
  }, transaction)

  for (const row of execRows) {
    const sessionId = row.sessionId
    const microserviceUuid = row.microserviceUuid
    if (!sessionId || !microserviceUuid) continue

    if (execSessionManager.getExecSession(sessionId)) continue

    const age = now - new Date(row.updatedAt).getTime()
    const threshold = row.status === 'PENDING' ? execPendingTimeout : execMaxDuration
    if (age < threshold) continue

    await MicroserviceExecSessionManager.deleteBySessionId(sessionId, transaction)

    const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
    if (microservice) {
      await ChangeTrackingService.update(
        microservice.iofogUuid,
        ChangeTrackingService.events.microserviceExecSessions,
        transaction
      )
    }

    execCleaned++
    logger.info('Reconciled stale exec session row:' + JSON.stringify({
      sessionId,
      microserviceUuid,
      status: row.status,
      ageMs: age
    }))
  }

  const msLogRows = await MicroserviceLogStatusManager.findAll({
    status: { [Op.in]: ['PENDING', 'ACTIVE'] }
  }, transaction)

  for (const row of msLogRows) {
    if (logSessionManager.getLogSession(row.sessionId)) continue

    const age = now - new Date(row.updatedAt).getTime()
    const threshold = row.status === 'PENDING' ? logPendingTimeout : logIdleTimeout
    if (age < threshold) continue

    await MicroserviceLogStatusManager.delete({ sessionId: row.sessionId }, transaction)
    logCleaned++

    const microservice = await MicroserviceManager.findOne({ uuid: row.microserviceUuid }, transaction)
    if (microservice) {
      await ChangeTrackingService.update(
        microservice.iofogUuid,
        ChangeTrackingService.events.microserviceLogs,
        transaction
      )
    }

    logger.info('Reconciled stale microservice log row:' + JSON.stringify({
      sessionId: row.sessionId,
      microserviceUuid: row.microserviceUuid,
      status: row.status,
      ageMs: age
    }))
  }

  const fogLogRows = await FogLogStatusManager.findAll({
    status: { [Op.in]: ['PENDING', 'ACTIVE'] }
  }, transaction)

  for (const row of fogLogRows) {
    if (logSessionManager.getLogSession(row.sessionId)) continue

    const age = now - new Date(row.updatedAt).getTime()
    const threshold = row.status === 'PENDING' ? logPendingTimeout : logIdleTimeout
    if (age < threshold) continue

    await FogLogStatusManager.delete({ sessionId: row.sessionId }, transaction)
    logCleaned++

    const fog = await FogManager.findOne({ uuid: row.iofogUuid }, transaction)
    if (fog) {
      await ChangeTrackingService.update(
        fog.uuid,
        ChangeTrackingService.events.fogLogs,
        transaction
      )
    }

    logger.info('Reconciled stale fog log row:' + JSON.stringify({
      sessionId: row.sessionId,
      iofogUuid: row.iofogUuid,
      status: row.status,
      ageMs: age
    }))
  }

  if (execCleaned > 0 || logCleaned > 0) {
    logger.info(`WS session reconcile completed: ${execCleaned} exec, ${logCleaned} log rows cleaned`)
  }
}

const _reconcileStaleSessions = TransactionDecorator.generateTransaction(
  reconcileStaleSessionsInTransaction,
  { priority: PRIORITY_BACKGROUND, label: 'ws.sessionReconcile' }
)

async function reconcileStaleSessions () {
  await _reconcileStaleSessions()
}

module.exports = {
  run
}
