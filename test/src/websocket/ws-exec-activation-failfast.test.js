const { expect } = require('chai')
const sinon = require('sinon')

const logger = require('../../../src/logger')
const WebSocketServerClass = require('../../../src/websocket/server')
const {
  createMockWebSocket,
  resetWebSocketServerSingleton,
  newTestIds,
  delay
} = require('../../support/ws-session-harness')
const { resetTransportForTests } = require('../../../src/services/ws-relay-transport-factory')

describe('WebSocket exec activation fail-fast', () => {
  def('sandbox', () => sinon.createSandbox())
  def('ids', () => newTestIds())

  let wsServer
  let transaction

  beforeEach(() => {
    resetTransportForTests()
    resetWebSocketServerSingleton(WebSocketServerClass)
    wsServer = new WebSocketServerClass()
    wsServer.relayTransport = {
      getTransport: () => 'amqp',
      isAvailable: async () => true,
      enableForSession: async () => true,
      shouldUseRelay: () => true,
      publishToAgent: async () => {},
      publishToUser: async () => {},
      cleanup: async () => {},
      onRecovery: () => {},
      shutdown: async () => {}
    }
    transaction = { fakeTransaction: true }

    $sandbox.stub(logger, 'info')
    $sandbox.stub(logger, 'error')
    $sandbox.stub(logger, 'warn')
    $sandbox.stub(logger, 'debug')
    $sandbox.stub(wsServer, 'sendMessageToAgent').resolves(false)
    $sandbox.stub(wsServer, '_cleanupExecSessionInTransaction').resolves()
  })

  afterEach(() => {
    $sandbox.restore()
    resetTransportForTests()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  it('does not log setup complete when activation fails', async () => {
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

    await wsServer.setupExecMessageForwarding(sessionId)
    await delay(20)

    const setupCompleteCalls = logger.info.getCalls().filter((call) => {
      const first = call.args[0]
      return typeof first === 'string' && first.includes('Exec message forwarding setup complete')
    })

    expect(setupCompleteCalls).to.have.length(0)
  })
})
