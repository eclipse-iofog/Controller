const { expect } = require('chai')
const sinon = require('sinon')
const { decodeJwt } = require('jose')
const {
  snapshotOidcEnv,
  DEFAULT_TEST_PASSWORD,
  createEmbeddedAuthHarness,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')

describe('Forced password change (CLI + RBAC)', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('harness', async () => createEmbeddedAuthHarness($sandbox))

  beforeEach(async () => {
    await $harness
  })

  afterEach(() => {
    $sandbox.restore()
    teardownEmbeddedAuth($envSnapshot)
  })

  it('issues access tokens with password_change_required for temp passwords', async () => {
    const { store, modules } = await $harness
    await store.seedUser({
      email: 'temp@example.com',
      groupNames: ['viewer'],
      mustChangePassword: true
    })

    const result = await modules.UserService.login({
      email: 'temp@example.com',
      password: DEFAULT_TEST_PASSWORD
    }, false)

    const claims = decodeJwt(result.accessToken)
    expect(claims.password_change_required).to.equal(true)
  })

  it('returns 403 on protected routes until password is changed', async () => {
    const { store, modules } = await $harness
    await store.seedUser({
      email: 'temp@example.com',
      groupNames: ['viewer'],
      mustChangePassword: true
    })

    const loginResult = await modules.UserService.login({
      email: 'temp@example.com',
      password: DEFAULT_TEST_PASSWORD
    }, false)

    const rbacMiddleware = require('../../../src/lib/rbac/middleware')
    const callback = $sandbox.spy()
    const req = {
      method: 'GET',
      path: '/api/v3/application',
      kauth: {
        grant: {
          access_token: {
            content: decodeJwt(loginResult.accessToken)
          }
        }
      }
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

    await rbacMiddleware.protect()(req, res, callback)

    expect(res.statusCode).to.equal(403)
    expect(callback).to.not.have.been.called
  })

  it('allows profile and change-password, then restores full access', async () => {
    const { store, modules } = await $harness
    await store.seedUser({
      email: 'temp@example.com',
      groupNames: ['viewer'],
      mustChangePassword: true
    })

    const loginResult = await modules.UserService.login({
      email: 'temp@example.com',
      password: DEFAULT_TEST_PASSWORD
    }, false)

    const authorizer = require('../../../src/lib/rbac/authorizer')
    $sandbox.stub(authorizer, 'authorize').resolves({ allowed: true })

    const rbacMiddleware = require('../../../src/lib/rbac/middleware')
    const profileReq = {
      method: 'GET',
      path: '/api/v3/user/profile',
      headers: {
        authorization: `Bearer ${loginResult.accessToken}`
      },
      kauth: {
        grant: {
          access_token: {
            content: decodeJwt(loginResult.accessToken)
          }
        }
      }
    }
    const profileRes = {
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
    const profileCallback = $sandbox.spy()
    await rbacMiddleware.protect()(profileReq, profileRes, profileCallback)
    expect(profileCallback).to.have.been.calledOnce

    await modules.AuthUserService.changePasswordWithCurrent(
      profileReq.kauth.grant.access_token.content.sub,
      DEFAULT_TEST_PASSWORD,
      'NewSecurePass456!'
    )

    const protectedReq = {
      method: 'GET',
      path: '/api/v3/application',
      kauth: profileReq.kauth
    }
    const protectedRes = {
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
    const protectedCallback = $sandbox.spy()
    await rbacMiddleware.protect()(protectedReq, protectedRes, protectedCallback)
    expect(protectedCallback).to.have.been.calledOnce
  })

  it('sets mustChangePassword true when admin creates a user with password', async () => {
    const { modules } = await $harness

    const created = await modules.AuthUserService.createUser({
      email: 'new-user@example.com',
      password: DEFAULT_TEST_PASSWORD,
      groups: ['developer']
    })

    expect(created.mustChangePassword).to.equal(true)
  })
})
