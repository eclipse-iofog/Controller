const { expect } = require('chai')
const sinon = require('sinon')

const WebSocketServerClass = require('../../../src/websocket/server')
const MicroserviceExecSessionManager = require('../../../src/data/managers/microservice-exec-session-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const AppHelper = require('../../../src/helpers/app-helper')
const RouterConnectionService = require('../../../src/services/router-connection-service')
const EventService = require('../../../src/services/event-service')
const {
  MESSAGE_TYPES,
  createMockWebSocket,
  createMockRequest,
  buildExecFrame,
  decodeExecMessage,
  createMockQueueService,
  resetWebSocketServerSingleton,
  newTestIds,
  waitForSent,
  delay
} = require('../../support/ws-session-harness')

describe('WebSocket exec/log — cross-replica mock AMQP', () => {
  def('sandbox', () => sinon.createSandbox())
  def('ids', () => newTestIds())

  let wsServer
  let mockQueue
  let transaction

  beforeEach(() => {
    resetWebSocketServerSingleton(WebSocketServerClass)
    wsServer = new WebSocketServerClass()
    mockQueue = createMockQueueService()
    wsServer.queueService = mockQueue
    transaction = { fakeTransaction: true }

    $sandbox.stub(RouterConnectionService, 'isRouterAvailable').resolves(true)
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
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  it('relays user STDIN to agent via mock AMQP bridge keyed by sessionId', async () => {
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
    await wsServer.setupExecMessageForwarding(sessionId, transaction)
    await delay(50)

    const session = wsServer.execSessionManager.getExecSession(sessionId)
    session.agent = agentWs
    await wsServer.setupExecMessageForwarding(sessionId, transaction)
    await delay(50)

    expect(mockQueue.shouldUseQueue(sessionId)).to.equal(true)

    const stdinFrame = buildExecFrame(MESSAGE_TYPES.STDIN, sessionId, $ids.microserviceUuid, 'echo hi\n')
    userWs.emit('message', stdinFrame, true)
    await waitForSent(agentWs, 1)

    expect(mockQueue.execBridges.has(sessionId)).to.equal(true)
    const agentReceived = decodeExecMessage(lastSent(agentWs))
    expect(agentReceived.type).to.equal(MESSAGE_TYPES.STDIN)
  })

  it('delivers agent STDOUT to user through mock AMQP publishToUser keyed by sessionId', async () => {
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
    await mockQueue.enableForSession(
      wsServer.execSessionManager.getExecSession(sessionId),
      () => {}
    )

    const stdoutFrame = buildExecFrame(MESSAGE_TYPES.STDOUT, sessionId, $ids.microserviceUuid, 'line\n')
    await mockQueue.publishToUser(sessionId, stdoutFrame)
    await waitForSent(userWs, 1)

    expect(mockQueue.shouldUseQueue(sessionId)).to.equal(true)
    const userReceived = decodeExecMessage(lastSent(userWs))
    expect(userReceived.type).to.equal(MESSAGE_TYPES.STDOUT)
  })

  it('routes log lines through mock AMQP bridge', async () => {
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

    await mockQueue.enableForLogSession(
      { sessionId, microserviceUuid: $ids.microserviceUuid, user: userWs, agent: null },
      () => {}
    )

    const logLine = buildExecFrame(MESSAGE_TYPES.LOG_LINE, sessionId, $ids.microserviceUuid, 'log entry\n')
    await mockQueue.publishLogToUser(sessionId, logLine)
    await delay(20)

    expect(mockQueue.logBridges.has(sessionId)).to.equal(true)
    expect(mockQueue.shouldUseLogQueue(sessionId)).to.equal(true)
  })

  it('user-first then agent-second delivers ACTIVATION and STDIN via AMQP bridge', async () => {
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

    expect(mockQueue.shouldUseQueue($ids.sessionId)).to.equal(true)
    expect(wsServer.execSessionManager.getExecSession($ids.sessionId).agent).to.equal(null)

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
    expect(agentReceived.data.toString()).to.include('echo hi')
  })

  it('resends ACTIVATION when agent WS reconnects', async () => {
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

    function countAgentActivations (ws) {
      return ws._sentMessages.filter((entry) => {
        try {
          return decodeExecMessage(entry.data).type === MESSAGE_TYPES.ACTIVATION
        } catch (e) {
          return false
        }
      }).length
    }

    expect(countAgentActivations(agentWs)).to.be.at.least(1)

    const reconnectedAgentWs = createMockWebSocket()
    await wsServer.handleAgentExecConnection(
      reconnectedAgentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      $ids.sessionId,
      transaction
    )
    await delay(50)

    expect(countAgentActivations(reconnectedAgentWs)).to.be.at.least(1)
    expect(wsServer.execSessionManager.getExecSession($ids.sessionId).agent).to.equal(reconnectedAgentWs)
  })
})

function lastSent (ws) {
  const entry = ws._sentMessages[ws._sentMessages.length - 1]
  return entry.data
}
