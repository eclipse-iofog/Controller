const { expect } = require('chai')
const sinon = require('sinon')

const WebSocketServerClass = require('../../../src/websocket/server')
const MicroserviceExecSessionManager = require('../../../src/data/managers/microservice-exec-session-manager')
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

describe('WebSocket exec/log — cross-replica mock NATS', () => {
  def('sandbox', () => sinon.createSandbox())
  def('ids', () => newTestIds())

  let wsServer
  let mockRelay
  let transaction

  beforeEach(() => {
    resetTransportForTests()
    resetWebSocketServerSingleton(WebSocketServerClass)
    wsServer = new WebSocketServerClass()
    mockRelay = createMockNatsRelayTransport()
    wsServer.relayTransport = mockRelay
    transaction = { fakeTransaction: true }

    $sandbox.stub(MicroserviceManager, 'update').resolves()
    $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
    $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(EventService, 'createWsConnectEvent').resolves()
    $sandbox.stub(EventService, 'createWsDisconnectEvent').resolves()
    $sandbox.stub(ChangeTrackingService, 'update').resolves()
    $sandbox.stub(MicroserviceExecSessionManager, 'create').resolves()
    $sandbox.stub(MicroserviceExecSessionManager, 'update').resolves()
    $sandbox.stub(MicroserviceExecSessionManager, 'deleteBySessionId').resolves()
    $sandbox.stub(MicroserviceExecSessionManager, 'findAll').resolves([])
    $sandbox.stub(MicroserviceExecSessionManager, 'findBySessionId').callsFake(async () => ({
      sessionId: $ids.sessionId,
      microserviceUuid: $ids.microserviceUuid,
      status: 'PENDING',
      userConnected: true,
      agentConnected: false
    }))
    $sandbox.stub(wsServer, 'validateUserConnection').resolves({ uuid: $ids.microserviceUuid })
    $sandbox.stub(wsServer, 'validateAgentExecConnection').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(AppHelper, 'generateUUID').returns($ids.sessionId)
    $sandbox.stub(wsServer, 'countExecSessionsInDb').resolves(0)
  })

  afterEach(() => {
    $sandbox.restore()
    resetTransportForTests()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  it('uses nats transport for cross-replica exec relay', async () => {
    expect(mockRelay.getTransport()).to.equal('nats')

    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const sessionId = $ids.sessionId

    wsServer.execSessionManager.createExecSession(
      sessionId,
      $ids.microserviceUuid,
      null,
      userWs,
      transaction
    )
    await wsServer.setupExecMessageForwarding(sessionId)
    await delay(50)

    const session = wsServer.execSessionManager.getExecSession(sessionId)
    session.agent = agentWs
    await wsServer.setupExecMessageForwarding(sessionId)
    await delay(50)

    expect(mockRelay.shouldUseRelay(sessionId)).to.equal(true)

    const stdinFrame = buildExecFrame(MESSAGE_TYPES.STDIN, sessionId, $ids.microserviceUuid, 'echo hi\n')
    userWs.emit('message', stdinFrame, true)
    await waitForSent(agentWs, 1)

    const agentReceived = decodeExecMessage(lastSent(agentWs))
    expect(agentReceived.type).to.equal(MESSAGE_TYPES.STDIN)
  })

  it('delivers agent STDOUT to user through mock NATS publishToUser', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const sessionId = $ids.sessionId

    wsServer.execSessionManager.createExecSession(
      sessionId,
      $ids.microserviceUuid,
      agentWs,
      userWs,
      transaction
    )
    await mockRelay.enableForSession(
      wsServer.execSessionManager.getExecSession(sessionId),
      () => {}
    )

    const stdoutFrame = buildExecFrame(MESSAGE_TYPES.STDOUT, sessionId, $ids.microserviceUuid, 'line\n')
    await mockRelay.publishToUser(sessionId, stdoutFrame)
    await waitForSent(userWs, 1)

    const userReceived = decodeExecMessage(lastSent(userWs))
    expect(userReceived.type).to.equal(MESSAGE_TYPES.STDOUT)
  })

  it('routes log lines through mock NATS bridge', async () => {
    const userWs = createMockWebSocket()
    const sessionId = $ids.sessionId

    wsServer.logSessionManager.createLogSession(
      sessionId,
      $ids.microserviceUuid,
      null,
      userWs,
      { lines: 100, follow: true, since: null, until: null },
      transaction
    )

    await mockRelay.enableForLogSession(
      { sessionId, microserviceUuid: $ids.microserviceUuid, user: userWs, agent: null },
      () => {}
    )

    const logLine = buildExecFrame(MESSAGE_TYPES.LOG_LINE, sessionId, $ids.microserviceUuid, 'log entry\n')
    await mockRelay.publishLogToUser(sessionId, logLine)
    await delay(20)

    expect(mockRelay.logBridges.has(sessionId)).to.equal(true)
    expect(mockRelay.shouldUseRelayForLogs(sessionId)).to.equal(true)
  })

  it('user-first then agent-second delivers ACTIVATION and STDIN via NATS bridge', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const userReq = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    userReq.headers.authorization = 'Bearer user-jwt'

    await wsServer.handleUserExecConnection(
      userWs,
      userReq,
      'Bearer user-jwt',
      $ids.microserviceUuid,
      false,
      transaction
    )
    await delay(50)

    expect(mockRelay.shouldUseRelay($ids.sessionId)).to.equal(true)

    const agentReq = createMockRequest(
      `/api/v3/agent/exec/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`,
      '127.0.0.2'
    )
    agentReq.headers.authorization = 'Bearer fog-token'
    await wsServer.handleAgentExecConnection(
      agentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      $ids.sessionId,
      transaction
    )
    await delay(50)

    const activationFrames = agentWs._sentMessages.filter((entry) => {
      try {
        return decodeExecMessage(entry.data).type === MESSAGE_TYPES.ACTIVATION
      } catch (e) {
        return false
      }
    })
    expect(activationFrames.length).to.be.at.least(1)

    const stdinFrame = buildExecFrame(
      MESSAGE_TYPES.STDIN,
      $ids.sessionId,
      $ids.microserviceUuid,
      'echo hi\n'
    )
    userWs.emit('message', stdinFrame, true)
    await waitForSent(agentWs, activationFrames.length + 1)

    const agentReceived = decodeExecMessage(lastSent(agentWs))
    expect(agentReceived.type).to.equal(MESSAGE_TYPES.STDIN)
  })
})

function lastSent (ws) {
  const entry = ws._sentMessages[ws._sentMessages.length - 1]
  return entry.data
}
