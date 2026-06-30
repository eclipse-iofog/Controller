const { expect } = require('chai')
const sinon = require('sinon')
const WebSocket = require('ws')

const ExecSessionManager = require('../../../src/websocket/exec-session-manager')
const LogSessionManager = require('../../../src/websocket/log-session-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const FogManager = require('../../../src/data/managers/iofog-manager')
const WebSocketServerClass = require('../../../src/websocket/server')
const MicroserviceExecSessionManager = require('../../../src/data/managers/microservice-exec-session-manager')
const MicroserviceLogStatusManager = require('../../../src/data/managers/microservice-log-status-manager')
const AppHelper = require('../../../src/helpers/app-helper')
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

  describe('exec 3-session quota', () => {
    let wsServer

    beforeEach(() => {
      resetWebSocketServerSingleton(WebSocketServerClass)
      wsServer = new WebSocketServerClass()
      wsServer.sessionConfig = { ...wsServer.sessionConfig, execMaxConcurrentPerResource: 3 }
    })

    afterEach(() => {
      resetWebSocketServerSingleton(WebSocketServerClass)
    })

    it('rejects fourth concurrent exec session for same microservice', async () => {
      $sandbox.stub(wsServer, 'validateUserConnection').resolves({ uuid: $ids.microserviceUuid })
      $sandbox.stub(wsServer, 'countExecSessionsInDb').resolves(3)

      const ws = createMockWebSocket()
      const req = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)

      await wsServer.handleUserExecConnection(
        ws,
        req,
        'Bearer token',
        $ids.microserviceUuid,
        false,
        $transaction
      )

      expect(ws.readyState).to.equal(WebSocket.CLOSED)
    })
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
    let execSessionManager

    beforeEach(() => {
      execSessionManager = new ExecSessionManager(FAST_CONFIG)
      execSessionManager.stopCleanupInterval()
      $sandbox.stub(MicroserviceExecSessionManager, 'deleteBySessionId').resolves()
      $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
      $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    afterEach(() => {
      execSessionManager.stopCleanupInterval()
    })

    it('expires user-only pending exec session after execPendingTimeoutMs', async () => {
      const userWs = createMockWebSocket()
      execSessionManager.createExecSession(
        $ids.sessionId,
        $ids.microserviceUuid,
        null,
        userWs,
        $transaction
      )

      const session = execSessionManager.getExecSession($ids.sessionId)
      session.createdAt = 0
      session.lastActivity = 0

      const cleaned = await execSessionManager.cleanupExpiredSessions($transaction)

      expect(cleaned).to.equal(1)
      expect(userWs.readyState).to.equal(WebSocket.CLOSED)
      expect(execSessionManager.getExecSession($ids.sessionId)).to.equal(null)
    })
  })

  describe('exec max duration (8h normative, accelerated in test)', () => {
    let execSessionManager

    beforeEach(() => {
      execSessionManager = new ExecSessionManager(FAST_CONFIG)
      execSessionManager.stopCleanupInterval()
      $sandbox.stub(MicroserviceExecSessionManager, 'deleteBySessionId').resolves()
      $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
      $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    afterEach(() => {
      execSessionManager.stopCleanupInterval()
    })

    it('removes paired exec session when execMaxDurationMs exceeded', async () => {
      const userWs = createMockWebSocket()
      const agentWs = createMockWebSocket()
      execSessionManager.createExecSession(
        $ids.sessionId,
        $ids.microserviceUuid,
        agentWs,
        userWs,
        $transaction
      )
      const session = execSessionManager.getExecSession($ids.sessionId)
      session.lastActivity = Date.now() - 300

      const cleaned = await execSessionManager.cleanupExpiredSessions($transaction)

      expect(cleaned).to.equal(1)
      expect(execSessionManager.getExecSession($ids.sessionId)).to.equal(null)
    })
  })

  describe('per-session exec cleanup (no exec_b)', () => {
    it('removeExecSession deletes DB row and updates execSessions change tracking', async () => {
      const execSessionManager = new ExecSessionManager(FAST_CONFIG)
      execSessionManager.stopCleanupInterval()
      $sandbox.stub(MicroserviceExecSessionManager, 'deleteBySessionId').resolves()
      $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
      $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
      $sandbox.stub(ChangeTrackingService, 'update').resolves()

      const userWs = createMockWebSocket()
      execSessionManager.createExecSession(
        $ids.sessionId,
        $ids.microserviceUuid,
        null,
        userWs,
        $transaction
      )
      await execSessionManager.removeExecSession($ids.sessionId, $transaction)

      expect(MicroserviceExecSessionManager.deleteBySessionId).to.have.been.calledWith(
        $ids.sessionId,
        $transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        $ids.fogUuid,
        ChangeTrackingService.events.microserviceExecSessions,
        $transaction
      )
    })
  })

  describe('relay setup deferred until transaction commits', () => {
    let wsServer

    beforeEach(() => {
      resetWebSocketServerSingleton(WebSocketServerClass)
      wsServer = new WebSocketServerClass()
    })

    afterEach(() => {
      resetWebSocketServerSingleton(WebSocketServerClass)
    })

    it('does not await relay setup before handleUserLogsConnection returns', async () => {
      let setupStarted = false
      $sandbox.stub(wsServer, 'validateUserLogsConnection').resolves({ success: true })
      $sandbox.stub(wsServer, 'countLogSessionsInDb').resolves(0)
      $sandbox.stub(wsServer, 'isValidISO8601').returns(true)
      $sandbox.stub(wsServer, 'setupLogMessageForwarding').callsFake(async () => {
        setupStarted = true
      })
      $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid, uuid: $ids.microserviceUuid })
      $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
      $sandbox.stub(MicroserviceLogStatusManager, 'create').resolves()
      $sandbox.stub(AppHelper, 'generateUUID').returns($ids.sessionId)

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

      expect(setupStarted).to.equal(false)
      await delay(10)
      expect(setupStarted).to.equal(true)
    })
  })
})
