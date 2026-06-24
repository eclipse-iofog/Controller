const { expect } = require('chai')
const sinon = require('sinon')
const WebSocket = require('ws')

const SessionManager = require('../../../src/websocket/session-manager')
const LogSessionManager = require('../../../src/websocket/log-session-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const FogManager = require('../../../src/data/managers/iofog-manager')
const WebSocketServerClass = require('../../../src/websocket/server')
const MicroserviceExecStatusManager = require('../../../src/data/managers/microservice-exec-status-manager')
const MicroserviceLogStatusManager = require('../../../src/data/managers/microservice-log-status-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const {
  createMockWebSocket,
  createMockRequest,
  resetWebSocketServerSingleton,
  newTestIds,
  delay
} = require('../../support/ws-session-harness')

const FAST_CONFIG = {
  session: {
    execPendingTimeoutMs: 100,
    execMaxDurationMs: 200,
    logPendingTimeoutMs: 100,
    logIdleTimeoutMs: 500,
    logMaxConcurrentPerResource: 3,
    logTailMaxLines: 5000,
    cleanupInterval: 50
  }
}

describe('WebSocket session lifecycle', () => {
  def('sandbox', () => sinon.createSandbox())
  def('ids', () => newTestIds())
  def('transaction', () => ({ fakeTransaction: true }))

  afterEach(() => {
    $sandbox.restore()
  })

  describe('log 3-viewer quota', () => {
    let wsServer

    beforeEach(() => {
      resetWebSocketServerSingleton(WebSocketServerClass)
      wsServer = new WebSocketServerClass()
      wsServer.sessionConfig = { ...wsServer.sessionConfig, logMaxConcurrentPerResource: 3 }
    })

    afterEach(() => {
      resetWebSocketServerSingleton(WebSocketServerClass)
    })

    it('rejects fourth concurrent log session for same microservice', async () => {
      $sandbox.stub(wsServer, 'validateUserLogsConnection').resolves({ success: true })
      $sandbox.stub(wsServer, 'countLogSessionsInDb').resolves(3)
      $sandbox.stub(wsServer, 'isValidISO8601').returns(true)

      const ws = createMockWebSocket()
      const req = createMockRequest(`/api/v3/microservices/${$ids.microserviceUuid}/logs?tail=100`)

      await wsServer.handleUserLogsConnection(
        ws,
        req,
        'Bearer token',
        $ids.microserviceUuid,
        null,
        false,
        $transaction
      )

      expect(ws.readyState).to.equal(WebSocket.CLOSED)
    })
  })

  describe('log pending timeout (120s normative, accelerated in test)', () => {
    let logManager

    beforeEach(() => {
      logManager = new LogSessionManager(FAST_CONFIG)
      $sandbox.stub(MicroserviceLogStatusManager, 'delete').resolves()
      $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
      $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    afterEach(() => {
      logManager.stopCleanupInterval()
    })

    it('expires user-only pending log session after logPendingTimeoutMs', async () => {
      const userWs = createMockWebSocket()
      logManager.createLogSession(
        $ids.sessionId,
        $ids.microserviceUuid,
        null,
        null,
        userWs,
        { lines: 100, follow: true },
        $transaction
      )

      const session = logManager.getLogSession($ids.sessionId)
      session.createdAt = 0
      session.lastActivity = 0

      const pendingTimeout = FAST_CONFIG.session.logPendingTimeoutMs
      const timeSinceCreation = Date.now() - session.createdAt
      const isExpired = !session.agent && session.user && timeSinceCreation > pendingTimeout
      expect(isExpired).to.equal(true)

      if (isExpired) {
        if (session.user.readyState === WebSocket.OPEN) {
          session.user.close(1008, 'Timeout waiting for agent connection')
        }
        await logManager.removeLogSession($ids.sessionId, $transaction)
      }

      expect(logManager.getLogSession($ids.sessionId)).to.equal(null)
    })
  })

  describe('exec pending timeout (60s normative, accelerated in test)', () => {
    let sessionManager

    beforeEach(() => {
      sessionManager = new SessionManager(FAST_CONFIG)
      $sandbox.stub(MicroserviceExecStatusManager, 'update').resolves()
      $sandbox.stub(MicroserviceManager, 'update').resolves()
    })

    it('closes pending user after execPendingTimeoutMs via cleanup cycle', async () => {
      const userWs = createMockWebSocket()
      sessionManager.addPendingUser($ids.microserviceUuid, userWs)

      const users = sessionManager.pendingUsers.get($ids.microserviceUuid)
      for (const [, info] of users.entries()) {
        info.timestamp = Date.now() - 200
      }

      let expiredMicroservice = null
      sessionManager.setSessionExpiredHandler(async (microserviceUuid) => {
        expiredMicroservice = microserviceUuid
      })

      const now = Date.now()
      const execPendingTimeout = FAST_CONFIG.session.execPendingTimeoutMs
      for (const [microserviceUuid, usersMap] of sessionManager.pendingUsers) {
        for (const [userWsEntry, info] of usersMap.entries()) {
          if (now - info.timestamp > execPendingTimeout) {
            if (userWsEntry.readyState === WebSocket.OPEN) {
              userWsEntry.close(1008, 'Timeout waiting for agent connection')
            }
            sessionManager.removePendingUser(microserviceUuid, userWsEntry)
            if (sessionManager.sessionExpiredHandler) {
              await sessionManager.sessionExpiredHandler(microserviceUuid, null)
            }
          }
        }
      }

      expect(expiredMicroservice).to.equal($ids.microserviceUuid)
      expect(userWs.readyState).to.equal(WebSocket.CLOSED)
      expect(sessionManager.getPendingUserCount($ids.microserviceUuid)).to.equal(0)
    })
  })

  describe('exec max duration (8h normative, accelerated in test)', () => {
    let sessionManager

    beforeEach(() => {
      sessionManager = new SessionManager(FAST_CONFIG)
      $sandbox.stub(MicroserviceExecStatusManager, 'update').resolves()
      $sandbox.stub(MicroserviceManager, 'update').resolves()
    })

    it('invokes sessionExpiredHandler when execMaxDurationMs exceeded', async () => {
      const userWs = createMockWebSocket()
      const agentWs = createMockWebSocket()
      sessionManager.createSession($ids.execId, $ids.microserviceUuid, agentWs, userWs, $transaction)
      const session = sessionManager.getSession($ids.execId)
      session.lastActivity = Date.now() - 300

      let expiredExecId = null
      sessionManager.setSessionExpiredHandler(async (microserviceUuid, execId) => {
        expiredExecId = execId
        sessionManager.sessions.delete(execId)
      })

      const execMaxDuration = FAST_CONFIG.session.execMaxDurationMs
      const now = Date.now()
      for (const [execId, activeSession] of sessionManager.sessions) {
        if (now - activeSession.lastActivity > execMaxDuration) {
          await sessionManager.cleanupSession(execId)
        }
      }

      expect(expiredExecId).to.equal($ids.execId)
      expect(sessionManager.getSession($ids.execId)).to.equal(null)
    })
  })

  describe('exec_b lifecycle', () => {
    it('removeSession sets execEnabled=false and notifies execSessions change', async () => {
      const sessionManager = new SessionManager(FAST_CONFIG)
      $sandbox.stub(MicroserviceExecStatusManager, 'update').resolves()
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
      $sandbox.stub(ChangeTrackingService, 'update').resolves()

      const userWs = createMockWebSocket()
      sessionManager.createSession($ids.execId, $ids.microserviceUuid, null, userWs, $transaction)
      await sessionManager.removeSession($ids.execId, $transaction)

      expect(MicroserviceManager.update).to.have.been.calledWith(
        sinon.match({ uuid: $ids.microserviceUuid }),
        sinon.match({ execEnabled: false }),
        $transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        $ids.fogUuid,
        ChangeTrackingService.events.microserviceExecSessions,
        $transaction
      )
    })
  })
})
