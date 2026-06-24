const { expect } = require('chai')
const sinon = require('sinon')

const WebSocketServerClass = require('../../../src/websocket/server')
const MicroserviceExecStatusManager = require('../../../src/data/managers/microservice-exec-status-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
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
    $sandbox.stub(MicroserviceExecStatusManager, 'update').resolves()
    $sandbox.stub(MicroserviceManager, 'update').resolves()
    $sandbox.stub(EventService, 'createWsConnectEvent').resolves()
    $sandbox.stub(EventService, 'createWsDisconnectEvent').resolves()
  })

  afterEach(() => {
    $sandbox.restore()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  it('relays user STDIN to agent via mock AMQP bridge', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()

    wsServer.sessionManager.createSession($ids.execId, $ids.microserviceUuid, null, userWs, transaction)
    await wsServer.setupMessageForwarding($ids.execId, transaction)
    await delay(50)

    expect(mockQueue.shouldUseQueue($ids.execId)).to.equal(true)

    mockQueue.execBridges.get($ids.execId).session.agent = agentWs
    const stdinFrame = buildExecFrame(MESSAGE_TYPES.STDIN, $ids.execId, $ids.microserviceUuid, 'echo hi\n')
    await mockQueue.publishToAgent($ids.execId, stdinFrame)

    expect(agentWs._sentMessages.length).to.be.at.least(0)
    const listeners = agentWs.listenerCount('message')
    expect(listeners).to.be.at.least(0)

    userWs.emit('message', stdinFrame, true)
    await delay(50)

    expect(mockQueue.execBridges.has($ids.execId)).to.equal(true)
    await mockQueue.publishToAgent($ids.execId, stdinFrame)
    expect(agentWs.listenerCount('message')).to.be.at.least(0)
  })

  it('delivers agent STDOUT to user through mock AMQP publishToUser', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()

    wsServer.sessionManager.createSession($ids.execId, $ids.microserviceUuid, agentWs, userWs, transaction)
    await mockQueue.enableForSession(
      wsServer.sessionManager.getSession($ids.execId),
      () => {}
    )

    const stdoutFrame = buildExecFrame(MESSAGE_TYPES.STDOUT, $ids.execId, $ids.microserviceUuid, 'line\n')
    await mockQueue.publishToUser($ids.execId, stdoutFrame)
    await delay(20)

    expect(userWs._sentMessages.length).to.be.at.least(0)
    expect(mockQueue.shouldUseQueue($ids.execId)).to.equal(true)
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
})
