const { expect } = require('chai')
const sinon = require('sinon')

const WebSocketServerClass = require('../../../src/websocket/server')
const MicroserviceExecSessionManager = require('../../../src/data/managers/microservice-exec-session-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const EventService = require('../../../src/services/event-service')
const AppHelper = require('../../../src/helpers/app-helper')
const {
  MESSAGE_TYPES,
  createMockWebSocket,
  createMockRequest,
  buildExecFrame,
  decodeExecMessage,
  resetWebSocketServerSingleton,
  newTestIds,
  waitForSent,
  delay
} = require('../../support/ws-session-harness')
const WebSocket = require('ws')

describe('WebSocket exec — same-replica integration (Plan 17)', () => {
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

    $sandbox.stub(wsServer.relayTransport, 'enableForSession').resolves(true)
    $sandbox.stub(wsServer.relayTransport, 'shouldUseRelay').returns(false)
    $sandbox.stub(wsServer.relayTransport, 'cleanup').resolves()

    $sandbox.stub(wsServer, 'validateUserConnection').resolves({ uuid: $ids.microserviceUuid })
    $sandbox.stub(wsServer, 'validateAgentExecConnection').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(AppHelper, 'generateUUID').returns($ids.sessionId)

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

    $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
    $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
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
    await wsServer.handleUserExecConnection(userWs, req, 'Bearer user-jwt', $ids.microserviceUuid, false, transaction)
  }

  async function connectAgentWithSessionId () {
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

  it('user-first: sends ACTIVATION to user with sessionId, then pairs agent by sessionId', async () => {
    await connectUserFirst()

    expect(activationFramesSent(userWs).length).to.be.at.least(1)
    const activation = decodeExecMessage(activationFramesSent(userWs)[0].data)
    expect(activation.type).to.equal(MESSAGE_TYPES.ACTIVATION)
    expect(activation.sessionId).to.equal($ids.sessionId)
    expect(activation.microserviceUuid).to.equal($ids.microserviceUuid)
    const activationPayload = JSON.parse(activation.data.toString())
    expect(activationPayload.sessionId).to.equal($ids.sessionId)
    expect(activationPayload.microserviceUuid).to.equal($ids.microserviceUuid)

    const session = wsServer.execSessionManager.getExecSession($ids.sessionId)
    expect(session).to.exist
    expect(session.user).to.equal(userWs)
    expect(session.agent).to.equal(null)

    await connectAgentWithSessionId()

    expect(session.agent).to.equal(agentWs)
    expect(activationFramesSent(agentWs).length).to.be.at.least(1)
  })

  it('pairs user and agent, relays STDIN/STDOUT, and cleans up on CLOSE', async () => {
    await connectUserFirst()
    await connectAgentWithSessionId()

    const session = wsServer.execSessionManager.getExecSession($ids.sessionId)
    expect(session).to.exist
    expect(session.user).to.equal(userWs)
    expect(session.agent).to.equal(agentWs)

    const stdinFrame = buildExecFrame(MESSAGE_TYPES.STDIN, $ids.sessionId, $ids.microserviceUuid, 'ls\n')
    userWs.emit('message', stdinFrame, true)
    await waitForSent(agentWs, 1)

    const agentReceived = decodeExecMessage(lastSent(agentWs))
    expect(agentReceived.type).to.equal(MESSAGE_TYPES.STDIN)

    const stdoutFrame = buildExecFrame(MESSAGE_TYPES.STDOUT, $ids.sessionId, $ids.microserviceUuid, 'output\n')
    agentWs.emit('message', stdoutFrame, true)
    await waitForSent(userWs, 2)

    const userReceived = decodeExecMessage(lastSent(userWs))
    expect(userReceived.type).to.equal(MESSAGE_TYPES.STDOUT)
    expect(userReceived.data.toString()).to.include('output')

    userWs.close(1000, 'done')
    await delay(300)

    expect(MicroserviceExecSessionManager.deleteBySessionId).to.have.been.calledWith(
      $ids.sessionId,
      sinon.match.any
    )
    expect(ChangeTrackingService.update).to.have.been.calledWith(
      $ids.fogUuid,
      ChangeTrackingService.events.microserviceExecSessions,
      sinon.match.any
    )
  })

  it('relays CLOSE from user to agent', async () => {
    await connectUserFirst()
    await connectAgentWithSessionId()

    const closeFrame = buildExecFrame(MESSAGE_TYPES.CLOSE, $ids.sessionId, $ids.microserviceUuid, 'bye')
    const sentBefore = agentWs._sentMessages.length
    userWs.emit('message', closeFrame, true)
    await delay(100)

    const closeSent = agentWs._sentMessages.slice(sentBefore).some((entry) => {
      const msg = decodeExecMessage(entry.data)
      return msg.type === MESSAGE_TYPES.CLOSE
    })
    expect(closeSent).to.equal(true)
  })

  it('pending user timeout cleans up when agent never connects', async () => {
    wsServer.getExecPendingTimeoutMs = () => 50

    await connectUserFirst()
    expect(wsServer.execSessionManager.getExecSession($ids.sessionId)).to.exist

    await delay(120)

    expect(wsServer.execSessionManager.getExecSession($ids.sessionId)).to.equal(null)
    expect(userWs.readyState).to.equal(WebSocket.CLOSED)
    expect(MicroserviceExecSessionManager.deleteBySessionId).to.have.been.calledWith(
      $ids.sessionId,
      sinon.match.any
    )
  })

  it('allows three concurrent exec sessions on same microservice', async () => {
    let dbSessionCount = 0
    $sandbox.stub(wsServer, 'countExecSessionsInDb').callsFake(async () => dbSessionCount)
    MicroserviceExecSessionManager.create.restore()
    $sandbox.stub(MicroserviceExecSessionManager, 'create').callsFake(async () => {
      dbSessionCount++
    })

    const sessionIds = []
    AppHelper.generateUUID.restore()
    $sandbox.stub(AppHelper, 'generateUUID').callsFake(() => {
      const id = `session-${sessionIds.length}`
      sessionIds.push(id)
      return id
    })

    const userSockets = []
    for (let i = 0; i < 3; i++) {
      const ws = createMockWebSocket()
      userSockets.push(ws)
      const req = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
      req.headers.authorization = 'Bearer user-jwt'
      await wsServer.handleUserExecConnection(
        ws,
        req,
        'Bearer user-jwt',
        $ids.microserviceUuid,
        false,
        transaction
      )
      expect(ws.readyState).to.equal(WebSocket.OPEN)
    }

    expect(wsServer.execSessionManager.countSessionsForResource($ids.microserviceUuid)).to.equal(3)

    const rejectedWs = createMockWebSocket()
    const rejectedReq = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    rejectedReq.headers.authorization = 'Bearer user-jwt'
    await wsServer.handleUserExecConnection(
      rejectedWs,
      rejectedReq,
      'Bearer user-jwt',
      $ids.microserviceUuid,
      false,
      transaction
    )
    expect(rejectedWs.readyState).to.equal(WebSocket.CLOSED)
  })

  it('closing one exec session does not affect sibling sessions', async () => {
    const sessionIds = ['session-a', 'session-b']
    let connectCount = 0
    AppHelper.generateUUID.restore()
    $sandbox.stub(AppHelper, 'generateUUID').callsFake(() => sessionIds[connectCount++])

    MicroserviceExecSessionManager.findAll.restore()
    $sandbox.stub(MicroserviceExecSessionManager, 'findAll').callsFake(async () =>
      sessionIds.slice(0, connectCount - 1).map((sessionId) => ({ sessionId }))
    )

    const userA = createMockWebSocket()
    const userB = createMockWebSocket()
    const reqA = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    reqA.headers.authorization = 'Bearer user-jwt'
    const reqB = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
    reqB.headers.authorization = 'Bearer user-jwt'

    await wsServer.handleUserExecConnection(userA, reqA, 'Bearer user-jwt', $ids.microserviceUuid, false, transaction)
    await wsServer.handleUserExecConnection(userB, reqB, 'Bearer user-jwt', $ids.microserviceUuid, false, transaction)

    expect(wsServer.execSessionManager.getExecSession('session-a')).to.exist
    expect(wsServer.execSessionManager.getExecSession('session-b')).to.exist

    userA.close(1000, 'done')
    await delay(300)

    expect(wsServer.execSessionManager.getExecSession('session-a')).to.equal(null)
    expect(wsServer.execSessionManager.getExecSession('session-b')).to.exist
    expect(userB.readyState).to.equal(WebSocket.OPEN)
  })

  it('rejects agent WS when sessionId is unknown', async () => {
    MicroserviceExecSessionManager.findBySessionId.restore()
    $sandbox.stub(MicroserviceExecSessionManager, 'findBySessionId').resolves(null)

    const agentReq = createMockRequest(
      `/api/v3/agent/exec/microservice/${$ids.microserviceUuid}/unknown-session`,
      '127.0.0.2'
    )
    agentReq.headers.authorization = 'Bearer fog-token'
    await wsServer.handleAgentExecConnection(
      agentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      'unknown-session',
      transaction
    )

    expect(agentWs.readyState).to.equal(WebSocket.CLOSED)
  })

  it('rejects agent WS when sessionId does not match microservice', async () => {
    MicroserviceExecSessionManager.findBySessionId.restore()
    $sandbox.stub(MicroserviceExecSessionManager, 'findBySessionId').resolves({
      sessionId: $ids.sessionId,
      microserviceUuid: 'other-ms-uuid',
      status: 'PENDING',
      userConnected: true,
      agentConnected: false
    })

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

    expect(agentWs.readyState).to.equal(WebSocket.CLOSED)
  })
})

function lastSent (ws) {
  const entry = ws._sentMessages[ws._sentMessages.length - 1]
  return entry.data
}
