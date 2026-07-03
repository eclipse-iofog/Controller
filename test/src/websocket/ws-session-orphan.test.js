const { expect } = require('chai')
const sinon = require('sinon')
const WebSocket = require('ws')

const WebSocketServerClass = require('../../../src/websocket/server')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const MicroserviceLogStatusManager = require('../../../src/data/managers/microservice-log-status-manager')
const MicroserviceExecSessionManager = require('../../../src/data/managers/microservice-exec-session-manager')
const FogLogStatusManager = require('../../../src/data/managers/fog-log-status-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const EventService = require('../../../src/services/event-service')
const { reconcileStaleSessionsInTransaction } = require('../../../src/jobs/ws-session-reconcile-job')
const agentService = require('../../../src/services/agent-service')
const {
  createMockWebSocket,
  createMockRequest,
  createMockNatsRelayTransport,
  resetWebSocketServerSingleton,
  newTestIds,
  delay
} = require('../../support/ws-session-harness')
const { resetTransportForTests } = require('../../../src/services/ws-relay-transport-factory')

describe('WebSocket session orphan cleanup', () => {
  def('sandbox', () => sinon.createSandbox())
  def('ids', () => newTestIds())

  let wsServer
  let transaction

  beforeEach(() => {
    resetTransportForTests()
    resetWebSocketServerSingleton(WebSocketServerClass)
    wsServer = new WebSocketServerClass()
    transaction = { fakeTransaction: true }
    $sandbox.stub(EventService, 'createWsConnectEvent').resolves()
    $sandbox.stub(EventService, 'createWsDisconnectEvent').resolves()
  })

  afterEach(() => {
    $sandbox.restore()
    resetTransportForTests()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  it('countLogSessionsInDb counts only userConnected PENDING/ACTIVE rows', async () => {
    const findAll = $sandbox.stub(MicroserviceLogStatusManager, 'findAll').resolves([
      { sessionId: 'live-1' }
    ])

    const count = await wsServer.countLogSessionsInDb($ids.microserviceUuid, null, transaction)

    expect(count).to.equal(1)
    expect(findAll).to.have.been.calledOnce
    const query = findAll.firstCall.args[0]
    expect(query.microserviceUuid).to.equal($ids.microserviceUuid)
    expect(query.userConnected).to.equal(true)
    expect(query.status[Op.in]).to.deep.equal(['PENDING', 'ACTIVE'])
  })

  it('countExecSessionsInDb counts only userConnected PENDING/ACTIVE rows', async () => {
    const findAll = $sandbox.stub(MicroserviceExecSessionManager, 'findAll').resolves([])

    await wsServer.countExecSessionsInDb($ids.microserviceUuid, transaction)

    expect(findAll).to.have.been.calledOnce
    const query = findAll.firstCall.args[0]
    expect(query.userConnected).to.equal(true)
    expect(query.status[Op.in]).to.deep.equal(['PENDING', 'ACTIVE'])
  })

  it('full-cleans log session when agent disconnects after user already left', async () => {
    const logRow = {
      sessionId: $ids.sessionId,
      microserviceUuid: $ids.microserviceUuid,
      iofogUuid: null,
      tailConfig: JSON.stringify({ lines: 100, follow: true, since: null, until: null }),
      agentConnected: true,
      userConnected: false
    }

    wsServer.relayTransport = createMockNatsRelayTransport()

    $sandbox.stub(MicroserviceLogStatusManager, 'findOne').callsFake(async () => ({ ...logRow }))
    $sandbox.stub(MicroserviceLogStatusManager, 'update').callsFake(async (_where, patch) => {
      Object.assign(logRow, patch)
    })
    $sandbox.stub(MicroserviceLogStatusManager, 'delete').resolves()
    $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
    $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(ChangeTrackingService, 'update').resolves()
    $sandbox.stub(wsServer, 'validateAgentLogsConnection').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(wsServer, 'cleanupLogSession').resolves()

    const agentWs = createMockWebSocket()
    const agentReq = createMockRequest(
      `/api/v3/agent/logs/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`
    )
    agentReq.headers.authorization = 'Bearer fog-token'

    await wsServer.handleAgentLogsConnection(
      agentWs,
      agentReq,
      'Bearer fog-token',
      $ids.microserviceUuid,
      null,
      $ids.sessionId,
      transaction
    )
    await delay(20)

    MicroserviceLogStatusManager.update.resetHistory()
    agentWs.close(1006)
    await delay(50)

    expect(wsServer.cleanupLogSession).to.have.been.calledOnceWith($ids.sessionId, sinon.match.object)
    expect(MicroserviceLogStatusManager.update).to.not.have.been.called
  })

  it('full-cleans exec session when agent disconnects after user already left', async () => {
    const execRow = {
      sessionId: $ids.sessionId,
      microserviceUuid: $ids.microserviceUuid,
      status: 'ACTIVE',
      userConnected: false,
      agentConnected: true
    }

    wsServer.relayTransport = createMockNatsRelayTransport()

    $sandbox.stub(MicroserviceExecSessionManager, 'findBySessionId').callsFake(async () => ({ ...execRow }))
    $sandbox.stub(MicroserviceExecSessionManager, 'update').callsFake(async (_where, patch) => {
      Object.assign(execRow, patch)
    })
    $sandbox.stub(MicroserviceExecSessionManager, 'deleteBySessionId').resolves()
    $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
    $sandbox.stub(FogManager, 'findOne').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(ChangeTrackingService, 'update').resolves()
    $sandbox.stub(wsServer, 'validateAgentExecConnection').resolves({ uuid: $ids.fogUuid })
    $sandbox.stub(wsServer, 'cleanupExecSession').resolves()

    const agentWs = createMockWebSocket()
    const agentReq = createMockRequest(
      `/api/v3/agent/exec/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`
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
    await delay(20)

    MicroserviceExecSessionManager.update.resetHistory()
    agentWs.close(1006)
    await delay(50)

    expect(wsServer.cleanupExecSession).to.have.been.calledOnceWith($ids.sessionId, sinon.match.object)
    expect(MicroserviceExecSessionManager.update).to.not.have.been.called
  })

  it('getAgentLogSessions omits rows without a connected user', async () => {
    const fog = { uuid: $ids.fogUuid }
    $sandbox.stub(MicroserviceManager, 'findAll').resolves([{ uuid: $ids.microserviceUuid }])
    $sandbox.stub(MicroserviceLogStatusManager, 'findAll').resolves([
      {
        microserviceUuid: $ids.microserviceUuid,
        sessionId: 'live-session',
        tailConfig: JSON.stringify({ lines: 100, follow: true }),
        status: 'ACTIVE',
        agentConnected: false
      }
    ])
    $sandbox.stub(FogLogStatusManager, 'findAll').resolves([])

    await agentService.getAgentLogSessions(fog, transaction)

    const query = MicroserviceLogStatusManager.findAll.firstCall.args[0]
    expect(query.userConnected).to.equal(true)
  })

  it('reconcile deletes orphaned log rows with both sides disconnected', async () => {
    const wsInstance = wsServer
    $sandbox.stub(WebSocketServerClass, 'getInstance').returns(wsInstance)

    $sandbox.stub(MicroserviceExecSessionManager, 'findAll').resolves([])
    $sandbox.stub(MicroserviceLogStatusManager, 'findAll').resolves([
      {
        sessionId: 'orphan-log',
        microserviceUuid: $ids.microserviceUuid,
        status: 'ACTIVE',
        userConnected: false,
        agentConnected: false,
        updatedAt: new Date(Date.now() - 1000)
      }
    ])
    $sandbox.stub(FogLogStatusManager, 'findAll').resolves([])
    $sandbox.stub(MicroserviceLogStatusManager, 'delete').resolves()
    $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: $ids.fogUuid })
    $sandbox.stub(ChangeTrackingService, 'update').resolves()

    await reconcileStaleSessionsInTransaction(transaction)

    expect(MicroserviceLogStatusManager.delete).to.have.been.calledOnceWith(
      { sessionId: 'orphan-log' },
      transaction
    )
  })
})
