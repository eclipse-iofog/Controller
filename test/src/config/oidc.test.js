const { expect } = require('chai')
const sinon = require('sinon')

const config = require('../../../src/config')
const {
  snapshotOidcEnv,
  applyEmbeddedEnv,
  applyExternalEnv,
  createEmbeddedAuthHarness,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')
const {
  applyOidcEnv,
  reloadOidcModule,
  runMiddleware
} = require('../../support/oidc-test-helpers')

describe('OIDC config', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('harness', async () => createEmbeddedAuthHarness($sandbox))

  afterEach(() => {
    $sandbox.restore()
    teardownEmbeddedAuth($envSnapshot)
  })

  describe('getAuthMode()', () => {
    it('defaults to embedded when AUTH_MODE is unset', () => {
      applyOidcEnv({})
      const oidc = reloadOidcModule()
      expect(oidc.getAuthMode()).to.equal('embedded')
    })

    it('throws for an invalid AUTH_MODE value', () => {
      applyOidcEnv({ AUTH_MODE: 'keycloak' })
      const oidc = reloadOidcModule()
      expect(() => oidc.getAuthMode()).to.throw('Invalid auth.mode')
    })
  })

  describe('isAuthConfigured()', () => {
    it('returns false when embedded mode has no public URL', () => {
      applyOidcEnv({})
      const oidc = reloadOidcModule()
      expect(oidc.isAuthConfigured()).to.equal(false)
    })

    it('returns true in embedded mode when CONTROLLER_PUBLIC_URL is set', () => {
      applyEmbeddedEnv()
      const oidc = reloadOidcModule()
      expect(oidc.isAuthConfigured()).to.equal(true)
    })

    it('returns true in external mode when issuer, client id, and secret are set', () => {
      applyExternalEnv()
      const oidc = reloadOidcModule()
      expect(oidc.isAuthConfigured()).to.equal(true)
    })
  })

  describe('initOidc() without auth config', () => {
    it('initializes without bearer validation when auth is not configured in dev mode', async () => {
      applyOidcEnv({})
      const oidc = reloadOidcModule()
      oidc.initOidc()

      const result = await runMiddleware(oidc.getOidcMiddleware(), {
        headers: {
          authorization: 'Bearer some-token'
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })
  })

  describe('initOidc() production mode', () => {
    beforeEach(() => {
      const originalGet = config.get.bind(config)
      $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
        if (key === 'server.devMode') {
          return false
        }
        return originalGet(key, defaultValue)
      })
    })

    it('throws when auth is not configured', () => {
      applyOidcEnv({})
      const oidc = reloadOidcModule()
      expect(() => oidc.initOidc()).to.throw('Auth configuration required in production mode')
    })
  })

  describe('getOidcMiddleware() with embedded issuer', () => {
    beforeEach(async () => {
      await $harness
    })

    it('populates req.kauth for a valid bearer token', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'alice@example.com',
        groupNames: ['sre']
      })

      const loginResult = await modules.UserService.login({
        email: 'alice@example.com',
        password: require('../../support/embedded-auth-harness').DEFAULT_TEST_PASSWORD
      }, false)

      modules.oidc.initOidc()
      const result = await runMiddleware(modules.oidc.getOidcMiddleware(), {
        headers: {
          authorization: `Bearer ${loginResult.accessToken}`
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth.grant.access_token.token).to.equal(loginResult.accessToken)
      expect(result.req.kauth.grant.access_token.content.preferred_username).to.equal('alice@example.com')
      expect(result.req.kauth.grant.access_token.content.groups).to.deep.equal(['sre'])
    })

    it('leaves req.kauth unset for an invalid bearer token', async () => {
      const { modules } = await $harness
      modules.oidc.initOidc()

      const result = await runMiddleware(modules.oidc.getOidcMiddleware(), {
        headers: {
          authorization: 'Bearer not-a-valid-jwt'
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })

    it('passes through when Authorization header is missing', async () => {
      const { modules } = await $harness
      modules.oidc.initOidc()

      const result = await runMiddleware(modules.oidc.getOidcMiddleware(), {
        headers: {}
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })

    it('skips OIDC validation for agent routes', async () => {
      const { modules } = await $harness
      modules.oidc.initOidc()

      const result = await runMiddleware(modules.oidc.getOidcMiddleware(), {
        path: '/api/v3/agent/status',
        headers: {
          authorization: 'Bearer not-an-oidc-token'
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })
  })
})
