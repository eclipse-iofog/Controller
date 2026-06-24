const { expect } = require('chai')
const sinon = require('sinon')
const WebSocket = require('ws')

const WebSocketServerClass = require('../../../src/websocket/server')
const MicroserviceExecStatusManager = require('../../../src/data/managers/microservice-exec-status-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const {
  createMockWebSocket,
  resetWebSocketServerSingleton,
  newTestIds,
  delay
} = require('../../support/ws-session-harness')

describe('WebSocket graceful drain', () => {
  def('sandbox', () => sinon.createSandbox())
  def('ids', () => newTestIds())
  def('transaction', () => ({ fakeTransaction: true }))

  let wsServer

  beforeEach(() => {
    resetWebSocketServerSingleton(WebSocketServerClass)
    wsServer = new WebSocketServerClass()
    wsServer.sessionConfig = {
      ...wsServer.sessionConfig,
      drainTimeoutMs: 500
    }

    $sandbox.stub(wsServer.queueService, 'cleanup').resolves()
    $sandbox.stub(wsServer.queueService, 'cleanupLogSession').resolves()
    $sandbox.stub(MicroserviceExecStatusManager, 'update').resolves()
    $sandbox.stub(MicroserviceManager, 'update').resolves()
  })

  afterEach(() => {
    $sandbox.restore()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  it('sets draining flag and closes active exec sessions within timeout budget', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    wsServer.sessionManager.createSession($ids.execId, $ids.microserviceUuid, agentWs, userWs, $transaction)
    wsServer.sessionManager.addPendingUser($ids.microserviceUuid, createMockWebSocket())

    const started = Date.now()
    await wsServer.drain(500)
    const elapsed = Date.now() - started

    expect(wsServer.isDraining).to.equal(true)
    expect(elapsed).to.be.at.most(800)
    expect(wsServer.sessionManager.getSession($ids.execId)).to.equal(null)
    expect(wsServer.sessionManager.getPendingUserCount($ids.microserviceUuid)).to.equal(0)
  })

  it('verifyClient rejects new upgrades while draining', (done) => {
    wsServer.isDraining = true
    wsServer.verifyClient({ req: { socket: { remoteAddress: '127.0.0.1' } } }, (err, ok) => {
      expect(ok).to.equal(false)
      expect(err.message).to.match(/draining/i)
      done()
    })
  })
})
