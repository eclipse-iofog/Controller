const { expect } = require('chai')
const sinon = require('sinon')
const { generateKeyPair, exportJWK } = require('jose')

const AuthLoginService = require('../../../src/services/auth-login-service')
const AuthMfaService = require('../../../src/services/auth-mfa-service')
const AuthTokenService = require('../../../src/services/auth-token-service')
const AuthPolicyService = require('../../../src/services/auth-policy-service')
const AuthPasswordService = require('../../../src/services/auth-password-service')
const Errors = require('../../../src/helpers/errors')

describe('Embedded auth login service', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => {
    $sandbox.restore()
  })

  describe('login()', () => {
    it('returns tokens when credentials are valid and MFA is not required', async () => {
      const user = { id: 'user-1', email: 'user@example.com', passwordHash: 'hash' }
      $sandbox.stub(AuthMfaService, 'loadUserAuthContext').resolves({
        user,
        groups: [{ name: 'viewer' }],
        mfa: null,
        groupNames: ['viewer']
      })
      $sandbox.stub(AuthPolicyService, 'getPolicy').resolves(AuthPolicyService.DEFAULT_POLICY)
      $sandbox.stub(AuthPolicyService, 'isAccountLocked').returns(false)
      $sandbox.stub(AuthPasswordService, 'verifyPassword').resolves(true)
      $sandbox.stub(AuthPolicyService, 'resetFailedLogin').resolves(user)
      $sandbox.stub(AuthTokenService, 'issueTokenPair').resolves({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      })

      const result = await AuthLoginService.login({
        email: 'user@example.com',
        password: 'correct-password'
      })

      expect(result).to.deep.equal({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      })
    })

    it('returns tokens for admin with MFA when totp is valid', async () => {
      const user = { id: 'admin-1', email: 'admin@example.com', passwordHash: 'hash', isBootstrap: false }
      $sandbox.stub(AuthMfaService, 'loadUserAuthContext').resolves({
        user,
        groups: [{ name: 'admin' }],
        mfa: { enabled: true },
        groupNames: ['admin']
      })
      $sandbox.stub(AuthPolicyService, 'getPolicy').resolves(AuthPolicyService.DEFAULT_POLICY)
      $sandbox.stub(AuthPolicyService, 'isAccountLocked').returns(false)
      $sandbox.stub(AuthPasswordService, 'verifyPassword').resolves(true)
      $sandbox.stub(AuthMfaService, 'verifyMfaCode').resolves(true)
      $sandbox.stub(AuthPolicyService, 'resetFailedLogin').resolves(user)
      $sandbox.stub(AuthTokenService, 'issueTokenPair').resolves({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      })

      const result = await AuthLoginService.login({
        email: 'admin@example.com',
        password: 'correct-password',
        totp: '123456'
      })

      expect(result.accessToken).to.equal('access-token')
      expect(AuthMfaService.verifyMfaCode).to.have.been.calledOnceWith('admin-1', '123456')
    })

    it('throws InvalidCredentialsError for admin with MFA when totp is missing', async () => {
      const user = { id: 'admin-1', email: 'admin@example.com', passwordHash: 'hash', isBootstrap: false }
      $sandbox.stub(AuthMfaService, 'loadUserAuthContext').resolves({
        user,
        groups: [{ name: 'admin' }],
        mfa: { enabled: true },
        groupNames: ['admin']
      })
      $sandbox.stub(AuthPolicyService, 'getPolicy').resolves(AuthPolicyService.DEFAULT_POLICY)
      $sandbox.stub(AuthPolicyService, 'isAccountLocked').returns(false)
      $sandbox.stub(AuthPasswordService, 'verifyPassword').resolves(true)

      try {
        await AuthLoginService.login({
          email: 'admin@example.com',
          password: 'correct-password',
          totp: ''
        })
        expect.fail('expected login to fail')
      } catch (error) {
        expect(error).to.be.instanceOf(Errors.InvalidCredentialsError)
      }
    })

    it('throws InvalidCredentialsError for non-bootstrap admin without MFA enrolled', async () => {
      const user = { id: 'admin-2', email: 'admin2@example.com', passwordHash: 'hash', isBootstrap: false }
      $sandbox.stub(AuthMfaService, 'loadUserAuthContext').resolves({
        user,
        groups: [{ name: 'admin' }],
        mfa: null,
        groupNames: ['admin']
      })
      $sandbox.stub(AuthPolicyService, 'getPolicy').resolves(AuthPolicyService.DEFAULT_POLICY)
      $sandbox.stub(AuthPolicyService, 'isAccountLocked').returns(false)
      $sandbox.stub(AuthPasswordService, 'verifyPassword').resolves(true)

      try {
        await AuthLoginService.login({
          email: 'admin2@example.com',
          password: 'correct-password'
        })
        expect.fail('expected login to fail')
      } catch (error) {
        expect(error).to.be.instanceOf(Errors.InvalidCredentialsError)
      }
    })

    it('returns tokens for bootstrap admin without MFA', async () => {
      const user = { id: 'bootstrap-1', email: 'bootstrap@example.com', passwordHash: 'hash', isBootstrap: true }
      $sandbox.stub(AuthMfaService, 'loadUserAuthContext').resolves({
        user,
        groups: [{ name: 'admin' }],
        mfa: null,
        groupNames: ['admin']
      })
      $sandbox.stub(AuthPolicyService, 'getPolicy').resolves(AuthPolicyService.DEFAULT_POLICY)
      $sandbox.stub(AuthPolicyService, 'isAccountLocked').returns(false)
      $sandbox.stub(AuthPasswordService, 'verifyPassword').resolves(true)
      $sandbox.stub(AuthPolicyService, 'resetFailedLogin').resolves(user)
      $sandbox.stub(AuthTokenService, 'issueTokenPair').resolves({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      })

      const result = await AuthLoginService.login({
        email: 'bootstrap@example.com',
        password: 'correct-password'
      })

      expect(result.accessToken).to.equal('access-token')
    })

    it('throws InvalidCredentialsError for unknown users', async () => {
      $sandbox.stub(AuthMfaService, 'loadUserAuthContext').resolves(null)

      try {
        await AuthLoginService.login({
          email: 'missing@example.com',
          password: 'password'
        })
        expect.fail('expected login to fail')
      } catch (error) {
        expect(error).to.be.instanceOf(Errors.InvalidCredentialsError)
      }
    })
  })
})

describe('Auth password service', () => {
  it('hashes and verifies passwords with Argon2id', async () => {
    const hash = await AuthPasswordService.hashPassword('SecurePass123')
    expect(await AuthPasswordService.verifyPassword('SecurePass123', hash)).to.equal(true)
    expect(await AuthPasswordService.verifyPassword('wrong', hash)).to.equal(false)
  })

  it('validates password complexity against policy defaults', () => {
    expect(() => AuthPasswordService.validatePasswordComplexity('short', AuthPolicyService.DEFAULT_POLICY))
      .to.throw(Errors.ValidationError)
  })
})

describe('Embedded OIDC local JWKS validation', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => require('../../support/oidc-test-helpers').snapshotOidcEnv())

  afterEach(() => {
    $sandbox.restore()
    require('../../support/oidc-test-helpers').restoreOidcEnv($envSnapshot)
    require('../../../src/config/oidc').resetDiscoveryForTests()
    require('../../../src/config/auth-jwks').resetSigningMaterialCacheForTests()
  })

  it('validates embedded access tokens via local JWKS', async () => {
    const { applyOidcEnv, reloadOidcModule, runMiddleware } = require('../../support/oidc-test-helpers')
    const AuthTokenService = require('../../../src/services/auth-token-service')
    const AuthJwks = require('../../../src/config/auth-jwks')

    applyOidcEnv({
      AUTH_MODE: 'embedded',
      CONTROLLER_PUBLIC_URL: 'https://controller.test'
    })

    const { publicKey, privateKey } = await generateKeyPair('RS256')
    const privateJwk = await exportJWK(privateKey)
    privateJwk.kid = 'test-kid'
    privateJwk.alg = 'RS256'
    privateJwk.use = 'sig'

    $sandbox.stub(AuthJwks, 'getActiveSigningMaterial').resolves({
      kid: 'test-kid',
      privateJwk,
      signingKey: privateKey
    })

    const user = { id: 'user-uuid', email: 'admin@example.com' }
    const accessToken = await AuthTokenService.issueAccessToken(user, ['admin'], AuthPolicyService.DEFAULT_POLICY)

    const oidc = reloadOidcModule()
    oidc.initOidc()

    const result = await runMiddleware(oidc.getOidcMiddleware(), {
      path: '/api/v3/application',
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    })

    expect(result.nextCalled).to.equal(true)
    expect(result.req.kauth.grant.access_token.content.sub).to.equal('user-uuid')
    expect(result.req.kauth.grant.access_token.content.groups).to.deep.equal(['admin'])
  })
})

describe('RBAC middleware without bearer token', () => {
  def('sandbox', () => sinon.createSandbox())
  def('callback', () => $sandbox.spy())

  afterEach(() => {
    $sandbox.restore()
  })

  it('returns 401 when no authentication information is present', async () => {
    const authorizer = require('../../../src/lib/rbac/authorizer')
    $sandbox.stub(authorizer, 'authorize').resolves(true)

    const rbacMiddleware = require('../../../src/lib/rbac/middleware')
    const req = {
      method: 'GET',
      path: '/api/v3/application',
      kauth: undefined
    }
    const res = {
      statusCode: null,
      body: null,
      status (code) {
        this.statusCode = code
        return this
      },
      json (payload) {
        this.body = payload
        return this
      }
    }

    await rbacMiddleware.protect()(req, res, $callback)

    expect(res.statusCode).to.equal(401)
    expect($callback).to.not.have.been.called
  })
})
