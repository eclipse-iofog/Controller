'use strict'

const { expect } = require('chai')
const { decodeJwt, SignJWT } = require('jose')
const sinon = require('sinon')
const { Configuration } = require('openid-client')
const Module = require('module')
const {
  snapshotOidcEnv,
  createEmbeddedAuthHarness,
  teardownEmbeddedAuth,
  applyExternalEnv
} = require('../../support/embedded-auth-harness')

function createTestOidcConfiguration () {
  return new Configuration(
    {
      issuer: 'https://idp.example.com/realms/test',
      authorization_endpoint: 'https://idp.example.com/realms/test/protocol/openid-connect/auth',
      token_endpoint: 'https://idp.example.com/realms/test/protocol/openid-connect/token',
      jwks_uri: 'https://idp.example.com/realms/test/protocol/openid-connect/certs'
    },
    'controller',
    { client_secret: 'external-test-secret' }
  )
}

describe('Auth OAuth service', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('harness', async () => createEmbeddedAuthHarness($sandbox, {
    env: { CONSOLE_URL: 'http://console.test' }
  }))
  def('oidcConfig', () => createTestOidcConfiguration())

  beforeEach(async () => {
    await $harness
    process.env.CONSOLE_URL = 'http://console.test'
    delete require.cache[require.resolve('../../../src/services/auth-oauth-service')]
    const oidcModule = require('../../../src/config/oidc')
    $sandbox.stub(oidcModule, 'getOauthClientConfiguration').resolves($oidcConfig)
  })

  afterEach(() => {
    delete require.cache[require.resolve('../../../src/services/auth-oauth-service')]
    $sandbox.restore()
    teardownEmbeddedAuth($envSnapshot)
  })

  it('includes PKCE parameters in authorize redirect and stores codeVerifier in session', async () => {
    const AuthOauthService = require('../../../src/services/auth-oauth-service')
    const req = { session: {} }

    const { redirectUrl } = await AuthOauthService.authorize(req)
    const url = new URL(redirectUrl)

    expect(url.searchParams.get('code_challenge_method')).to.equal('S256')
    expect(url.searchParams.get('code_challenge')).to.be.a('string').and.not.be.empty
    expect(url.searchParams.get('scope')).to.equal('openid profile email groups offline_access')
    expect(url.searchParams.get('prompt')).to.equal('login')
    expect(req.session.controllerOauth.codeVerifier).to.be.a('string').and.not.be.empty
    expect(req.session.controllerOauth.state).to.be.a('string').and.not.be.empty
    expect(req.session.controllerOauth.nonce).to.be.a('string').and.not.be.empty
  })

  it('does not include prompt=login in external auth mode', async () => {
    applyExternalEnv({})
    process.env.CONSOLE_URL = 'http://console.test'

    const AuthOauthService = require('../../../src/services/auth-oauth-service')
    const req = { session: {} }

    const { redirectUrl } = await AuthOauthService.authorize(req)
    const url = new URL(redirectUrl)

    expect(url.searchParams.get('prompt')).to.be.null
  })

  it('returns oauthError payload when issuer redirects with error=access_denied', async () => {
    const AuthOauthService = require('../../../src/services/auth-oauth-service')
    const req = {
      session: {
        controllerOauth: {
          state: 'test-state',
          nonce: 'test-nonce',
          codeVerifier: 'test-pkce-verifier',
          createdAt: Date.now()
        }
      },
      originalUrl: '/api/v3/user/oauth/callback?error=access_denied&state=test-state'
    }

    const result = await AuthOauthService.callback(req)

    expect(result.oauthError).to.equal('access_denied')
    expect(result.consoleUrl).to.equal('http://console.test')
    expect(result.tokens).to.be.undefined
    expect(req.session.controllerOauth).to.be.undefined
  })

  it('passes pkceCodeVerifier to authorizationCodeGrant on callback', async () => {
    applyExternalEnv({})
    process.env.CONSOLE_URL = 'http://console.test'

    const grantStub = $sandbox.stub().resolves({
      access_token: 'external-access-token',
      refresh_token: 'external-refresh-token'
    })

    const authOauthServicePath = require.resolve('../../../src/services/auth-oauth-service')
    delete require.cache[authOauthServicePath]

    const originalRequire = Module.prototype.require
    Module.prototype.require = function (request, ...args) {
      const loaded = originalRequire.call(this, request, ...args)
      if (
        request === 'openid-client' &&
        typeof this.filename === 'string' &&
        this.filename.endsWith('auth-oauth-service.js')
      ) {
        return { ...loaded, authorizationCodeGrant: grantStub }
      }
      return loaded
    }

    let AuthOauthService
    try {
      AuthOauthService = require('../../../src/services/auth-oauth-service')
    } finally {
      Module.prototype.require = originalRequire
    }

    const req = {
      session: {
        controllerOauth: {
          state: 'test-state',
          nonce: 'test-nonce',
          codeVerifier: 'test-pkce-verifier',
          createdAt: Date.now()
        }
      },
      originalUrl: '/api/v3/user/oauth/callback?code=auth-code&state=test-state'
    }

    const result = await AuthOauthService.callback(req)

    expect(grantStub).to.have.been.calledOnce
    expect(grantStub.firstCall.args[2].pkceCodeVerifier).to.equal('test-pkce-verifier')
    expect(grantStub.firstCall.args[2].expectedState).to.equal('test-state')
    expect(grantStub.firstCall.args[2].expectedNonce).to.equal('test-nonce')
    expect(result.tokens.accessToken).to.equal('external-access-token')
    expect(result.tokens.refreshToken).to.equal('external-refresh-token')
    expect(result.consoleUrl).to.equal('http://console.test')
    expect(req.session.controllerOauth).to.be.undefined
  })

  it('resolves embedded oauth users from id_token and issues Controller JWT pair', async () => {
    const { store, signing } = await $harness
    const AuthOauthService = require('../../../src/services/auth-oauth-service')
    const AuthTokenService = require('../../../src/services/auth-token-service')

    const { user } = await store.seedUser({
      email: 'viewer@example.com',
      groupNames: ['viewer']
    })

    const idToken = await new SignJWT({ email: 'viewer@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: signing.privateJwk.kid })
      .setSubject(user.id)
      .setIssuer(`${process.env.CONTROLLER_PUBLIC_URL}/oidc`)
      .setAudience('controller')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(signing.privateKey)

    expect(decodeJwt(idToken).sub).to.equal(user.id)

    const resolvedUser = await AuthOauthService.resolveEmbeddedUserFromTokenResponse({
      id_token: idToken
    })
    const tokens = await AuthTokenService.issueTokenPair(resolvedUser, ['viewer'])

    expect(resolvedUser.id).to.equal(user.id)
    expect(tokens.accessToken.split('.')).to.have.length(3)
    expect(tokens.refreshToken.split('.')).to.have.length(3)

    const accessClaims = decodeJwt(tokens.accessToken)
    const refreshClaims = decodeJwt(tokens.refreshToken)

    expect(accessClaims.sub).to.equal(user.id)
    expect(accessClaims.token_use).to.equal('access')
    expect(refreshClaims.token_use).to.equal('refresh')
    expect(refreshClaims.sub).to.equal(user.id)
  })
})
