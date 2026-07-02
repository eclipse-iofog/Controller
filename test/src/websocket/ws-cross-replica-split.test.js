const { expect } = require('chai')
const sinon = require('sinon')
const WebSocket = require('ws')

const WebSocketServerClass = require('../../../src/websocket/server')
const MicroserviceExecSessionManager = require('../../../src/data/managers/microservice-exec-session-manager')
const MicroserviceLogStatusManager = require('../../../src/data/managers/microservice-log-status-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const AppHelper = require('../../../src/helpers/app-helper')
const EventService = require('../../../src/services/event-service')
const {
  MESSAGE_TYPES,
  createMockWebSocket,
  createMockRequest,
  buildExecFrame,
  decodeExecMessage,
  createMockNatsRelayTransport,
  resetWebSocketServerSingleton,
  newTestIds,
  waitForSent,
  delay
} = require('../../support/ws-session-harness')
const { resetTransportForTests } = require('../../../src/services/ws-relay-transport-factory')

function lastSent (ws) {
  return ws._sentMessages[ws._sentMessages.length - 1].data
}

function hasSentMessageType (ws, type) {
  return ws._sentMessages.some((entry) => {
    try {
      return decodeExecMessage(entry.data).type === type
    } catch (e) {
      return false
    }
  })
}

function hasSentText (ws, needle) {
  return ws._sentMessages.some((entry) => {
    try {
      const msg = decodeExecMessage(entry.data)
      return msg.data && msg.data.toString().includes(needle)
    } catch (e) {
      return false
    }
  })
}

describe('WebSocket exec/log — split replica pairing', () => {
  def('sandbox', () => sinon.createSandbox())
  def('ids', () => newTestIds())

  let serverA
  let serverB
  let sharedRelay
  let transaction
  let execRow

  beforeEach(() => {
    resetTransportForTests()
    resetWebSocketServerSingleton(WebSocketServerClass)

    sharedRelay = createMockNatsRelayTransport()
    serverA = new WebSocketServerClass()
    serverB = new WebSocketServerClass()
    serverA.relayTransport = sharedRelay
    serverB.relayTransport = sharedRelay
    serverA.sessionConfig.execPendingTimeoutMs = 500
    serverA.sessionConfig.logPendingTimeoutMs = 500
    serverB.sessionConfig.execPendingTimeoutMs = 500
    serverB.sessionConfig.logPendingTimeoutMs = 500

    transaction = { fakeTransaction: true }
    execRow = {
      sessionId: $ids.sessionId,
      microserviceUuid: $ids.microserviceUuid,
      status: 'PENDING',
      userConnected: true,
      agentConnected: false
    }

    $sandbox.stub(MicroserviceManager, 'update').resolves()
    $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
    $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(EventService, 'createWsConnectEvent').resolves()
    $sandbox.stub(EventService, 'createWsDisconnectEvent').resolves()
    $sandbox.stub(ChangeTrackingService, 'update').resolves()
    $sandbox.stub(MicroserviceExecSessionManager, 'create').resolves()
    $sandbox.stub(MicroserviceExecSessionManager, 'update').callsFake(async (_where, patch) => {
      Object.assign(execRow, patch)
    })
    $sandbox.stub(MicroserviceExecSessionManager, 'deleteBySessionId').resolves()
    $sandbox.stub(MicroserviceExecSessionManager, 'findAll').resolves([])
    $sandbox.stub(MicroserviceExecSessionManager, 'findBySessionId').callsFake(async () => ({ ...execRow }))
    $sandbox.stub(serverA, 'validateUserConnection').resolves({ uuid: $ids.microserviceUuid })
    $sandbox.stub(serverB, 'validateAgentExecConnection').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(AppHelper, 'generateUUID').returns($ids.sessionId)
    $sandbox.stub(serverA, 'countExecSessionsInDb').resolves(0)
    $sandbox.stub(serverB, 'countExecSessionsInDb').resolves(0)
  })

  afterEach(() => {
    $sandbox.restore()
    resetTransportForTests()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  it('relays ACTIVATION when each replica has its own relay bridge map', async () => {
    serverA.relayTransport = createMockNatsRelayTransport()
    serverB.relayTransport = createMockNatsRelayTransport()

    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const userReq = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    userReq.headers.authorization = 'Bearer user-jwt'

    await serverA.handleUserExecConnection(
      userWs,
      userReq,
      'Bearer user-jwt',
      $ids.microserviceUuid,
      false,
      transaction
    )
    await delay(50)

    const agentReq = createMockRequest(
      `/api/v3/agent/exec/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`,
      '127.0.0.2'
    )
    agentReq.headers.authorization = 'Bearer fog-token'
    await serverB.handleAgentExecConnection(
      agentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      $ids.sessionId,
      transaction
    )
    await delay(50)

    expect(userWs.readyState).to.equal(WebSocket.OPEN)
    expect(hasSentMessageType(agentWs, MESSAGE_TYPES.ACTIVATION)).to.equal(true)
    expect(serverB.relayTransport.shouldUseRelay($ids.sessionId)).to.equal(true)
  })

  it('keeps exec user open when agent connects on replica B and relays ACTIVATION', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const userReq = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    userReq.headers.authorization = 'Bearer user-jwt'

    await serverA.handleUserExecConnection(
      userWs,
      userReq,
      'Bearer user-jwt',
      $ids.microserviceUuid,
      false,
      transaction
    )
    await delay(50)

    const agentReq = createMockRequest(
      `/api/v3/agent/exec/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`,
      '127.0.0.2'
    )
    agentReq.headers.authorization = 'Bearer fog-token'
    await serverB.handleAgentExecConnection(
      agentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      $ids.sessionId,
      transaction
    )
    await delay(50)

    expect(userWs.readyState).to.equal(WebSocket.OPEN)
    expect(hasSentMessageType(agentWs, MESSAGE_TYPES.ACTIVATION)).to.equal(true)
    expect(hasSentText(userWs, 'Interactive exec is ready')).to.equal(true)

    const stdinFrame = buildExecFrame(
      MESSAGE_TYPES.STDIN,
      $ids.sessionId,
      $ids.microserviceUuid,
      'echo hi\n'
    )
    userWs.emit('message', stdinFrame, true)
    await waitForSent(agentWs, 1)

    const agentReceived = decodeExecMessage(lastSent(agentWs))
    expect(agentReceived.type).to.equal(MESSAGE_TYPES.STDIN)
  })

  it('uses DB fallback for exec pending timeout when agentConnected is true', async () => {
    execRow.agentConnected = true
    const userWs = createMockWebSocket()
    const userReq = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    userReq.headers.authorization = 'Bearer user-jwt'

    await serverA.handleUserExecConnection(
      userWs,
      userReq,
      'Bearer user-jwt',
      $ids.microserviceUuid,
      false,
      transaction
    )

    await delay(700)
    expect(userWs.readyState).to.equal(WebSocket.OPEN)
    const session = serverA.execSessionManager.getExecSession($ids.sessionId)
    expect(session.remoteAgentPaired).to.equal(true)
  })

  it('relays log agent-ready LOG_LINE to user on replica A', async () => {
    const logRow = {
      sessionId: $ids.sessionId,
      microserviceUuid: $ids.microserviceUuid,
      tailConfig: JSON.stringify({ lines: 100, follow: true, since: null, until: null }),
      agentConnected: false,
      userConnected: true
    }

    $sandbox.stub(MicroserviceLogStatusManager, 'create').resolves()
    $sandbox.stub(MicroserviceLogStatusManager, 'update').callsFake(async (_where, patch) => {
      Object.assign(logRow, patch)
    })
    $sandbox.stub(MicroserviceLogStatusManager, 'delete').resolves()
    $sandbox.stub(MicroserviceLogStatusManager, 'findOne').callsFake(async () => ({ ...logRow }))
    $sandbox.stub(serverA, 'validateUserLogsConnection').resolves()
    $sandbox.stub(serverB, 'validateAgentLogsConnection').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(serverA, 'countLogSessionsInDb').resolves(0)

    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const userReq = createMockRequest(`/api/v3/microservices/logs/${$ids.microserviceUuid}?tail=100`)
    userReq.headers.authorization = 'Bearer user-jwt'

    await serverA.handleUserLogsConnection(
      userWs,
      userReq,
      'Bearer user-jwt',
      $ids.microserviceUuid,
      null,
      false,
      transaction
    )
    await delay(50)

    const agentReq = createMockRequest(
      `/api/v3/agent/logs/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`,
      '127.0.0.2'
    )
    agentReq.headers.authorization = 'Bearer fog-token'
    await serverB.handleAgentLogsConnection(
      agentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      null,
      $ids.sessionId,
      transaction
    )
    await delay(50)

    expect(userWs.readyState).to.equal(WebSocket.OPEN)
    expect(hasSentMessageType(agentWs, MESSAGE_TYPES.LOG_START)).to.equal(true)
    expect(hasSentText(userWs, 'Log streaming started')).to.equal(true)
    expect(hasSentMessageType(userWs, MESSAGE_TYPES.LOG_LINE)).to.equal(true)
  })

  it('notifies user and preserves DB row when agent disconnects on replica B', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const userReq = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    userReq.headers.authorization = 'Bearer user-jwt'

    await serverA.handleUserExecConnection(
      userWs,
      userReq,
      'Bearer user-jwt',
      $ids.microserviceUuid,
      false,
      transaction
    )
    await delay(50)

    const agentReq = createMockRequest(
      `/api/v3/agent/exec/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`,
      '127.0.0.2'
    )
    agentReq.headers.authorization = 'Bearer fog-token'
    await serverB.handleAgentExecConnection(
      agentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      $ids.sessionId,
      transaction
    )
    await delay(50)

    execRow.agentConnected = true
    MicroserviceExecSessionManager.deleteBySessionId.resetHistory()

    agentWs.close()
    await delay(50)

    expect(MicroserviceExecSessionManager.deleteBySessionId).to.not.have.been.called
    expect(execRow.agentConnected).to.equal(false)
    expect(hasSentMessageType(userWs, MESSAGE_TYPES.CLOSE)).to.equal(true)
    expect(serverB.execSessionManager.getExecSession($ids.sessionId)).to.equal(null)
    expect(serverA.execSessionManager.getExecSession($ids.sessionId)).to.not.equal(null)
  })

  it('keeps paired exec user open past pending timeout window', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const userReq = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    userReq.headers.authorization = 'Bearer user-jwt'

    await serverA.handleUserExecConnection(
      userWs,
      userReq,
      'Bearer user-jwt',
      $ids.microserviceUuid,
      false,
      transaction
    )
    await delay(50)

    const agentReq = createMockRequest(
      `/api/v3/agent/exec/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`,
      '127.0.0.2'
    )
    agentReq.headers.authorization = 'Bearer fog-token'
    await serverB.handleAgentExecConnection(
      agentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      $ids.sessionId,
      transaction
    )
    await delay(100)

    expect(hasSentText(userWs, 'Interactive exec is ready')).to.equal(true)

    await delay(700)
    expect(userWs.readyState).to.equal(WebSocket.OPEN)
  })

  it('keeps paired exec agent on replica B past pending timeout window', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const userReq = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    userReq.headers.authorization = 'Bearer user-jwt'

    await serverA.handleUserExecConnection(
      userWs,
      userReq,
      'Bearer user-jwt',
      $ids.microserviceUuid,
      false,
      transaction
    )
    await delay(50)

    const agentReq = createMockRequest(
      `/api/v3/agent/exec/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`,
      '127.0.0.2'
    )
    agentReq.headers.authorization = 'Bearer fog-token'
    await serverB.handleAgentExecConnection(
      agentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      $ids.sessionId,
      transaction
    )
    await delay(100)

    const agentSession = serverB.execSessionManager.getExecSession($ids.sessionId)
    expect(agentSession.remoteUserPaired).to.equal(true)

    MicroserviceExecSessionManager.deleteBySessionId.resetHistory()
    await delay(700)

    expect(agentWs.readyState).to.equal(WebSocket.OPEN)
    expect(MicroserviceExecSessionManager.deleteBySessionId).to.not.have.been.called
    expect(serverB.execSessionManager.getExecSession($ids.sessionId)).to.not.equal(null)
  })

  it('preserves DB row when user disconnects on replica A with agent on replica B', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const userReq = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    userReq.headers.authorization = 'Bearer user-jwt'

    await serverA.handleUserExecConnection(
      userWs,
      userReq,
      'Bearer user-jwt',
      $ids.microserviceUuid,
      false,
      transaction
    )
    await delay(50)

    const agentReq = createMockRequest(
      `/api/v3/agent/exec/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`,
      '127.0.0.2'
    )
    agentReq.headers.authorization = 'Bearer fog-token'
    await serverB.handleAgentExecConnection(
      agentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      $ids.sessionId,
      transaction
    )
    await delay(50)

    execRow.agentConnected = true
    MicroserviceExecSessionManager.deleteBySessionId.resetHistory()

    userWs.close()
    await delay(50)

    expect(MicroserviceExecSessionManager.deleteBySessionId).to.not.have.been.called
    expect(execRow.userConnected).to.equal(false)
    expect(execRow.agentConnected).to.equal(true)
    expect(serverA.execSessionManager.getExecSession($ids.sessionId)).to.equal(null)
    expect(serverB.execSessionManager.getExecSession($ids.sessionId)).to.not.equal(null)
    expect(hasSentMessageType(agentWs, MESSAGE_TYPES.CLOSE)).to.equal(true)
  })
})
