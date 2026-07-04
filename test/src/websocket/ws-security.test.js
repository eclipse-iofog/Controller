const { expect } = require('chai')
const sinon = require('sinon')
const WebSocket = require('ws')

const WebSocketServerClass = require('../../../src/websocket/server')
const authorizer = require('../../../src/lib/rbac/authorizer')
const rbacMiddleware = require('../../../src/lib/rbac/middleware')
const {
  createMockWebSocket,
  createMockRequest,
  buildFakeJwt,
  resetWebSocketServerSingleton,
  newTestIds,
  delay
} = require('../../support/ws-session-harness')

describe('WebSocket session security', () => {
  def('sandbox', () => sinon.createSandbox())
  def('ids', () => newTestIds())

  afterEach(() => {
    $sandbox.restore()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  describe('RBAC deny on user exec WebSocket', () => {
    it('closes with 1008 when RBAC denies execSessions', async () => {
      const ws = createMockWebSocket()
      const req = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
      req.headers.authorization = 'Bearer denied-token'

      $sandbox.stub(authorizer, 'authorizeRequest').resolves({
        allowed: false,
        reason: 'Access denied: insufficient permissions'
      })

      const handlerCalled = sinon.stub().resolves()
      const protectedHandler = rbacMiddleware.protectWebSocket(handlerCalled)

      await protectedHandler(ws, req)

      expect(handlerCalled).to.not.have.been.called
      expect(ws.readyState).to.equal(WebSocket.CLOSED)
    })

    it('calls handler when RBAC authorizer allows', async () => {
      const ws = createMockWebSocket()
      const req = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
      const token = buildFakeJwt()
      req.headers.authorization = token

      $sandbox.stub(authorizer, 'authorizeRequest').resolves({ allowed: true })

      const handlerCalled = sinon.stub().resolves()
      const protectedHandler = rbacMiddleware.protectWebSocket(handlerCalled)

      await protectedHandler(ws, req)

      expect(handlerCalled).to.have.been.calledOnce
    })
  })

  describe('upgrade rate limits', () => {
    let wsServer

    beforeEach(() => {
      resetWebSocketServerSingleton(WebSocketServerClass)
      wsServer = new WebSocketServerClass()
    })

    it('rejects upgrades when per-IP rate limit exceeded', (done) => {
      const ip = '10.0.0.99'
      const info = { req: { socket: { remoteAddress: ip } } }
      const config = require('../../../src/config')
      const maxPerMinute = config.get('server.webSocket.security.maxRequestsPerMinute')

      wsServer.rateLimits.set(ip, { count: maxPerMinute, resetTime: Date.now() + 60000 })

      wsServer.verifyClient(info, (err, ok) => {
        expect(ok).to.equal(false)
        expect(err.message).to.match(/Rate limit/i)
        done()
      })
    })

    it('rejects upgrades when per-IP connection limit exceeded', (done) => {
      const ip = '10.0.0.100'
      const config = require('../../../src/config')
      const maxConnections = config.get('server.webSocket.security.maxConnectionsPerIp')
      wsServer.connectionLimits.set(ip, maxConnections)
      const info = { req: { socket: { remoteAddress: ip } } }

      wsServer.verifyClient(info, (err, ok) => {
        expect(ok).to.equal(false)
        expect(err.message).to.match(/Too many connections/i)
        done()
      })
    })

    it('rejects upgrades while server is draining', (done) => {
      wsServer.isDraining = true
      const info = { req: { socket: { remoteAddress: '10.0.0.1' } } }

      wsServer.verifyClient(info, (err, ok) => {
        expect(ok).to.equal(false)
        expect(err.message).to.match(/draining/i)
        done()
      })
    })
  })

  describe('agent message blocked before auth', () => {
    it('does not attach message handler until agent validation succeeds', async () => {
      resetWebSocketServerSingleton(WebSocketServerClass)
      const wsServer = new WebSocketServerClass()
      const agentWs = createMockWebSocket()
      const transaction = { fakeTransaction: true }

      let validationResolved = false
      $sandbox.stub(wsServer, 'validateAgentExecConnection').callsFake(async () => {
        await delay(30)
        validationResolved = true
        throw new Error('Invalid agent token')
      })

      const agentReq = createMockRequest(
        `/api/v3/agent/exec/microservice/${$ids.microserviceUuid}/${$ids.sessionId}`
      )
      agentReq.headers.authorization = 'Bearer bad-token'

      const handlerPromise = wsServer.handleAgentExecConnection(
        agentWs,
        agentReq,
        'Bearer bad-token',
        $ids.microserviceUuid,
        $ids.sessionId,
        transaction
      )

      agentWs.emit('message', Buffer.from('early'), true)
      await handlerPromise.catch(() => {})
      await delay(50)

      expect(validationResolved).to.equal(true)
      expect(agentWs.readyState).to.equal(WebSocket.CLOSED)
      expect(wsServer.execSessionManager.execSessions.size).to.equal(0)
    })
  })
})
