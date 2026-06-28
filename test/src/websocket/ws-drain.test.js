const { expect } = require('chai')
const sinon = require('sinon')

const WebSocketServerClass = require('../../../src/websocket/server')
const MicroserviceExecSessionManager = require('../../../src/data/managers/microservice-exec-session-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
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

    $sandbox.stub(wsServer.relayTransport, 'cleanup').resolves()
    $sandbox.stub(wsServer.relayTransport, 'cleanupLogSession').resolves()
    $sandbox.stub(MicroserviceExecSessionManager, 'deleteBySessionId').resolves()
    $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
    $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(ChangeTrackingService, 'update').resolves()
  })

  afterEach(() => {
    $sandbox.restore()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  it('sets draining flag and closes active exec sessions within timeout budget', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    wsServer.execSessionManager.createExecSession(
      $ids.execId,
      $ids.microserviceUuid,
      agentWs,
      userWs,
      $transaction
    )

    const started = Date.now()
    await wsServer.drain(500)
    const elapsed = Date.now() - started

    expect(wsServer.isDraining).to.equal(true)
    expect(elapsed).to.be.at.most(800)
    expect(wsServer.execSessionManager.getExecSession($ids.execId)).to.equal(null)
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
