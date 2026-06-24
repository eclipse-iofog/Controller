const { expect } = require('chai')
const sinon = require('sinon')

const WebSocketServerClass = require('../../../src/websocket/server')
const MicroserviceExecStatusManager = require('../../../src/data/managers/microservice-exec-status-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const EventService = require('../../../src/services/event-service')
const {
  MESSAGE_TYPES,
  createMockWebSocket,
  createMockRequest,
  buildAgentInitialMessage,
  buildExecFrame,
  decodeExecMessage,
  resetWebSocketServerSingleton,
  newTestIds,
  waitForSent,
  delay
} = require('../../support/ws-session-harness')
const WebSocket = require('ws')

describe('WebSocket exec — same-replica integration', () => {
  def('sandbox', () => sinon.createSandbox())
  def('ids', () => newTestIds())

  let wsServer
  let userWs
  let agentWs
  let transaction

  beforeEach(() => {
    resetWebSocketServerSingleton(WebSocketServerClass)
    wsServer = new WebSocketServerClass()
    userWs = createMockWebSocket()
    agentWs = createMockWebSocket()
    transaction = { fakeTransaction: true }

    $sandbox.stub(wsServer.queueService, 'enableForSession').resolves(true)
    $sandbox.stub(wsServer.queueService, 'shouldUseQueue').returns(false)
    $sandbox.stub(wsServer.queueService, 'cleanup').resolves()

    $sandbox.stub(wsServer, 'validateUserConnection').resolves({ uuid: $ids.microserviceUuid })
    $sandbox.stub(wsServer, 'validateAgentConnection').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(wsServer, 'getPendingAgentExecIdsFromDB').resolves([])

    $sandbox.stub(MicroserviceExecStatusManager, 'update').resolves()
    $sandbox.stub(MicroserviceManager, 'update').resolves()
    $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
    $sandbox.stub(ChangeTrackingService, 'update').resolves()
    $sandbox.stub(EventService, 'createWsConnectEvent').resolves()
    $sandbox.stub(EventService, 'createWsDisconnectEvent').resolves()
  })

  afterEach(() => {
    $sandbox.restore()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  async function connectUserFirst () {
    const req = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    req.headers.authorization = 'Bearer user-jwt'
    await wsServer.handleUserConnection(userWs, req, 'Bearer user-jwt', $ids.microserviceUuid, false, transaction)
  }

  async function connectAgentWithExecId () {
    const agentReq = createMockRequest(`/api/v3/agent/exec/${$ids.microserviceUuid}`, '127.0.0.2')
    agentReq.headers.authorization = 'Bearer fog-token'
    await wsServer.handleAgentConnection(agentWs, agentReq, 'Bearer fog-token', $ids.microserviceUuid, transaction)
    agentWs.emit('message', buildAgentInitialMessage($ids.execId, $ids.microserviceUuid), true)
    await delay(50)
  }

  function activationFramesSent (ws) {
    return ws._sentMessages.filter((entry) => {
      try {
        const msg = decodeExecMessage(entry.data)
        return msg.type === MESSAGE_TYPES.ACTIVATION
      } catch (e) {
        return false
      }
    })
  }

  it('agent-first: defers ACTIVATION until user connects', async () => {
    wsServer.getPendingAgentExecIdsFromDB.restore()
    $sandbox.stub(wsServer, 'getPendingAgentExecIdsFromDB').callsFake(async () => {
      const pending = wsServer.sessionManager.getSession($ids.execId)
      return pending && pending.agent && !pending.user ? [$ids.execId] : []
    })

    await connectAgentWithExecId()

    expect(activationFramesSent(agentWs)).to.have.length(0)
    expect(wsServer.sessionManager.getSession($ids.execId)).to.exist
    expect(wsServer.sessionManager.getSession($ids.execId).user).to.equal(null)

    await connectUserFirst()

    await delay(50)
    expect(activationFramesSent(agentWs).length).to.be.at.least(1)
    const session = wsServer.sessionManager.getSession($ids.execId)
    expect(session.user).to.equal(userWs)
    expect(session.agent).to.equal(agentWs)
  })

  it('captures initial msgpack sent during agent validation', async () => {
    $sandbox.restore()
    resetWebSocketServerSingleton(WebSocketServerClass)
    wsServer = new WebSocketServerClass()
    userWs = createMockWebSocket()
    agentWs = createMockWebSocket()
    transaction = { fakeTransaction: true }

    $sandbox.stub(wsServer.queueService, 'enableForSession').resolves(true)
    $sandbox.stub(wsServer.queueService, 'shouldUseQueue').returns(false)
    $sandbox.stub(wsServer.queueService, 'cleanup').resolves()
    $sandbox.stub(wsServer, 'validateUserConnection').resolves({ uuid: $ids.microserviceUuid })
    $sandbox.stub(wsServer, 'getPendingAgentExecIdsFromDB').resolves([])
    $sandbox.stub(MicroserviceExecStatusManager, 'update').resolves()
    $sandbox.stub(MicroserviceManager, 'update').resolves()
    $sandbox.stub(EventService, 'createWsConnectEvent').resolves()
    $sandbox.stub(EventService, 'createWsDisconnectEvent').resolves()

    $sandbox.stub(wsServer, 'validateAgentConnection').callsFake(async () => {
      agentWs.emit('message', buildAgentInitialMessage($ids.execId, $ids.microserviceUuid), true)
      await delay(20)
      return { uuid: $ids.fogUuid }
    })

    await connectUserFirst()
    const agentReq = createMockRequest(`/api/v3/agent/exec/${$ids.microserviceUuid}`, '127.0.0.2')
    agentReq.headers.authorization = 'Bearer fog-token'
    await wsServer.handleAgentConnection(agentWs, agentReq, 'Bearer fog-token', $ids.microserviceUuid, transaction)
    await delay(50)

    const session = wsServer.sessionManager.getSession($ids.execId)
    expect(session).to.exist
    expect(session.user).to.equal(userWs)
    expect(session.agent).to.equal(agentWs)
    expect(activationFramesSent(agentWs).length).to.be.at.least(1)
  })

  it('pairs user and agent, relays STDIN/STDOUT, and exec_b disables exec on CLOSE', async () => {
    await connectUserFirst()
    expect(wsServer.sessionManager.getPendingUserCount($ids.microserviceUuid)).to.equal(1)

    await connectAgentWithExecId()

    const session = wsServer.sessionManager.getSession($ids.execId)
    expect(session).to.exist
    expect(session.user).to.equal(userWs)
    expect(session.agent).to.equal(agentWs)

    const stdinFrame = buildExecFrame(MESSAGE_TYPES.STDIN, $ids.execId, $ids.microserviceUuid, 'ls\n')
    userWs.emit('message', stdinFrame, true)
    await waitForSent(agentWs, 1)

    const agentReceived = decodeExecMessage(lastSent(agentWs))
    expect(agentReceived.type).to.equal(MESSAGE_TYPES.STDIN)

    const stdoutFrame = buildExecFrame(MESSAGE_TYPES.STDOUT, $ids.execId, $ids.microserviceUuid, 'output\n')
    agentWs.emit('message', stdoutFrame, true)
    await waitForSent(userWs, 1)

    const userReceived = decodeExecMessage(lastSent(userWs))
    expect(userReceived.type).to.equal(MESSAGE_TYPES.STDOUT)
    expect(userReceived.data.toString()).to.include('output')

    userWs.close(1000, 'done')
    await delay(300)

    expect(MicroserviceManager.update).to.have.been.calledWith(
      sinon.match({ uuid: $ids.microserviceUuid }),
      sinon.match({ execEnabled: false }),
      sinon.match.any
    )
    expect(MicroserviceExecStatusManager.update).to.have.been.calledWith(
      sinon.match({ microserviceUuid: $ids.microserviceUuid }),
      sinon.match({ status: sinon.match.string }),
      transaction
    )
  })

  it('relays CLOSE from user to agent', async () => {
    await connectUserFirst()
    await connectAgentWithExecId()

    const closeFrame = buildExecFrame(MESSAGE_TYPES.CLOSE, $ids.execId, $ids.microserviceUuid, 'bye')
    const sentBefore = agentWs._sentMessages.length
    userWs.emit('message', closeFrame, true)
    await delay(100)

    const closeSent = agentWs._sentMessages.slice(sentBefore).some((entry) => {
      const msg = decodeExecMessage(entry.data)
      return msg.type === MESSAGE_TYPES.CLOSE
    })
    expect(closeSent).to.equal(true)
  })

  it('pending user timeout cleans up orphaned agent-only session', async () => {
    wsServer.getExecPendingTimeoutMs = () => 50

    await connectAgentWithExecId()
    expect(wsServer.sessionManager.getSession($ids.execId)).to.exist
    expect(wsServer.sessionManager.getSession($ids.execId).user).to.equal(null)

    wsServer.getPendingAgentExecIdsFromDB.restore()
    $sandbox.stub(wsServer, 'getPendingAgentExecIdsFromDB').resolves([])

    await connectUserFirst()
    expect(wsServer.sessionManager.getPendingUserCount($ids.microserviceUuid)).to.equal(1)

    await delay(120)

    expect(wsServer.sessionManager.getSession($ids.execId)).to.equal(null)
    expect(agentWs.readyState).to.equal(WebSocket.CLOSED)
    expect(MicroserviceManager.update).to.have.been.calledWith(
      sinon.match({ uuid: $ids.microserviceUuid }),
      sinon.match({ execEnabled: false }),
      sinon.match.any
    )
    expect(ChangeTrackingService.update).to.have.been.calledWith(
      $ids.fogUuid,
      ChangeTrackingService.events.microserviceExecSessions,
      sinon.match.any
    )
  })

  it('re-handshakes agent init on reused open socket', async () => {
    wsServer.getPendingAgentExecIdsFromDB.restore()
    $sandbox.stub(wsServer, 'getPendingAgentExecIdsFromDB').callsFake(async () => {
      const pending = wsServer.sessionManager.getSession($ids.execId)
      return pending && pending.agent && !pending.user ? [$ids.execId] : []
    })

    await connectAgentWithExecId()
    expect(wsServer.sessionManager.getSession($ids.execId)).to.exist

    const newExecId = `${$ids.execId}-reused`
    agentWs.emit('message', buildAgentInitialMessage(newExecId, $ids.microserviceUuid), true)
    await delay(50)

    expect(wsServer.sessionManager.getSession($ids.execId)).to.equal(null)
    expect(wsServer.sessionManager.getSession(newExecId)).to.exist
    expect(wsServer.sessionManager.getSession(newExecId).agent).to.equal(agentWs)
  })
})

function lastSent (ws) {
  const entry = ws._sentMessages[ws._sentMessages.length - 1]
  return entry.data
}
