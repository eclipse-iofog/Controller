const { expect } = require('chai')
const sinon = require('sinon')
const WebSocket = require('ws')
const { generateKeyPair, exportJWK, SignJWT } = require('jose')

const WebSocketServerClass = require('../../../src/websocket/server')
const authorizer = require('../../../src/lib/rbac/authorizer')
const rbacMiddleware = require('../../../src/lib/rbac/middleware')
const oidc = require('../../../src/config/oidc')
const AuthJwks = require('../../../src/config/auth-jwks')
const transactionRunner = require('../../../src/helpers/transaction-runner')
const RbacCacheVersionManager = require('../../../src/data/managers/rbac-cache-version-manager')
const {
  applyOidcEnv,
  snapshotOidcEnv,
  restoreOidcEnv
} = require('../../support/oidc-test-helpers')
const {
  createMockWebSocket,
  createMockRequest,
  resetWebSocketServerSingleton,
  newTestIds,
  delay
} = require('../../support/ws-session-harness')

const EMBEDDED_ISSUER = 'https://controller.test/oidc'
const EMBEDDED_AUDIENCE = 'controller'

async function useEmbeddedSigningKey (sandbox) {
  applyOidcEnv({
    AUTH_MODE: 'embedded',
    CONTROLLER_PUBLIC_URL: 'https://controller.test',
    OIDC_CLIENT_ID: EMBEDDED_AUDIENCE
  })
  oidc.resetDiscoveryForTests()
  AuthJwks.resetSigningMaterialCacheForTests()

  const { privateKey } = await generateKeyPair('RS256')
  const privateJwk = await exportJWK(privateKey)
  privateJwk.kid = 'test-kid'
  privateJwk.alg = 'RS256'
  privateJwk.use = 'sig'
  sandbox.stub(AuthJwks, 'getActiveSigningMaterial').resolves({
    kid: 'test-kid',
    privateJwk,
    signingKey: privateKey
  })
  return privateKey
}

async function signOperatorToken (signingKey, claims = {}, options = {}) {
  const builder = new SignJWT({
    preferred_username: 'operator@example.com',
    groups: ['admin'],
    token_use: 'access',
    ...claims
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setSubject(options.subject || 'user-uuid')
    .setIssuer(options.issuer || EMBEDDED_ISSUER)
    .setAudience(options.audience || EMBEDDED_AUDIENCE)
    .setIssuedAt()

  if (options.expiresAt) {
    builder.setExpirationTime(options.expiresAt)
  } else {
    builder.setExpirationTime('15m')
  }

  return builder.sign(signingKey)
}

function forgeAdminToken () {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({
      sub: 'nobody',
      preferred_username: 'attacker',
      groups: ['admin']
    }),
    'not-a-signature'
  ].join('.')
}

function allowSystemRoleWithoutDatabase (sandbox) {
  sandbox.stub(RbacCacheVersionManager, 'getVersionWithoutTransaction').resolves(1)
  sandbox.stub(transactionRunner, 'runInTransaction').callsFake(async (work) => work({}))
}

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

    it('calls handler when a signed token passes and RBAC authorizer allows', async () => {
      const envSnapshot = snapshotOidcEnv()
      try {
        const signingKey = await useEmbeddedSigningKey($sandbox)
        const token = await signOperatorToken(signingKey, { groups: ['viewer'] })
        const ws = createMockWebSocket()
        const req = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
        req.headers.authorization = `Bearer ${token}`

        $sandbox.stub(authorizer, 'authorizeRequest').resolves({ allowed: true })

        const handlerCalled = sinon.stub().resolves()
        const protectedHandler = rbacMiddleware.protectWebSocket(handlerCalled)

        await protectedHandler(ws, req)

        expect(handlerCalled).to.have.been.calledOnce
        expect(req.verifiedAccessToken.preferred_username).to.equal('operator@example.com')
      } finally {
        restoreOidcEnv(envSnapshot)
        oidc.resetDiscoveryForTests()
        AuthJwks.resetSigningMaterialCacheForTests()
      }
    })
  })

  describe('operator access token verification', () => {
    def('envSnapshot', () => snapshotOidcEnv())
    def('signingKey', () => useEmbeddedSigningKey($sandbox))

    afterEach(() => {
      restoreOidcEnv($envSnapshot)
      oidc.resetDiscoveryForTests()
      AuthJwks.resetSigningMaterialCacheForTests()
    })

    async function connectExec (token) {
      const ws = createMockWebSocket()
      const req = createMockRequest(`/api/v3/microservices/exec/${$ids.microserviceUuid}`)
      req.headers.authorization = `Bearer ${token}`
      const handlerCalled = sinon.stub().resolves()
      await rbacMiddleware.protectWebSocket(handlerCalled)(ws, req)
      return { ws, req, handlerCalled }
    }

    it('denies a forged admin token', async () => {
      await $signingKey
      const { ws, handlerCalled } = await connectExec(forgeAdminToken())
      expect(handlerCalled).to.not.have.been.called
      expect(ws.readyState).to.equal(WebSocket.CLOSED)
    })

    it('denies a refresh token', async () => {
      const token = await signOperatorToken(await $signingKey, { token_use: 'refresh' })
      const { ws, handlerCalled } = await connectExec(token)
      expect(handlerCalled).to.not.have.been.called
      expect(ws.readyState).to.equal(WebSocket.CLOSED)
    })

    it('denies an expired token', async () => {
      const token = await signOperatorToken(await $signingKey, {}, {
        expiresAt: Math.floor(Date.now() / 1000) - 30
      })
      const { ws, handlerCalled } = await connectExec(token)
      expect(handlerCalled).to.not.have.been.called
      expect(ws.readyState).to.equal(WebSocket.CLOSED)
    })

    it('denies a token with the wrong audience', async () => {
      const token = await signOperatorToken(await $signingKey, {}, { audience: 'other-client' })
      const { ws, handlerCalled } = await connectExec(token)
      expect(handlerCalled).to.not.have.been.called
      expect(ws.readyState).to.equal(WebSocket.CLOSED)
    })

    it('denies a token with the wrong issuer', async () => {
      const token = await signOperatorToken(await $signingKey, {}, { issuer: 'https://evil.example/oidc' })
      const { ws, handlerCalled } = await connectExec(token)
      expect(handlerCalled).to.not.have.been.called
      expect(ws.readyState).to.equal(WebSocket.CLOSED)
    })

    it('denies a fog-shaped token on the user exec route', async () => {
      await $signingKey
      const { privateKey } = await generateKeyPair('EdDSA')
      const fogToken = await new SignJWT({ groups: ['admin'], preferred_username: 'fog' })
        .setProtectedHeader({ alg: 'EdDSA' })
        .setSubject('fog-uuid')
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(privateKey)

      const { ws, handlerCalled } = await connectExec(fogToken)
      expect(handlerCalled).to.not.have.been.called
      expect(ws.readyState).to.equal(WebSocket.CLOSED)
    })

    it('allows a signed admin token through protectWebSocket', async () => {
      allowSystemRoleWithoutDatabase($sandbox)
      const token = await signOperatorToken(await $signingKey, { groups: ['admin'] })
      const { ws, req, handlerCalled } = await connectExec(token)
      expect(handlerCalled).to.have.been.calledOnce
      expect(ws.readyState).to.equal(WebSocket.OPEN)
      expect(req.verifiedAccessToken.groups).to.deep.equal(['admin'])
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
