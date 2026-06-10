const { expect } = require('chai')
const sinon = require('sinon')

const config = require('../../../src/config')
const { MockOidcProvider } = require('../../support/mock-oidc-provider')
const {
  snapshotOidcEnv,
  restoreOidcEnv,
  applyOidcEnv,
  enableMockOidcTls,
  restoreMockOidcTls,
  reloadOidcModule,
  runMiddleware
} = require('../../support/oidc-test-helpers')

describe('OIDC config', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('provider', () => new MockOidcProvider())

  beforeEach(async () => {
    enableMockOidcTls()
    await $provider.start()
  })

  afterEach(async () => {
    $sandbox.restore()
    restoreOidcEnv($envSnapshot)
    restoreMockOidcTls()
    await $provider.stop()
  })

  describe('isAuthConfigured()', () => {
    it('returns false when OIDC env vars are unset', () => {
      applyOidcEnv({})
      const oidc = reloadOidcModule()
      expect(oidc.isAuthConfigured()).to.equal(false)
    })

    it('returns true when issuer, client id, and secret are set', () => {
      applyOidcEnv($provider.getEnv())
      const oidc = reloadOidcModule()
      expect(oidc.isAuthConfigured()).to.equal(true)
    })
  })

  describe('initOidc() dev mode', () => {
    it('uses pass-through middleware when auth is not configured', async () => {
      applyOidcEnv({})
      const oidc = reloadOidcModule()
      oidc.initOidc()

      const result = await runMiddleware(oidc.getOidcMiddleware(), {
        headers: {}
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

  describe('getOidcMiddleware() with mock issuer', () => {
    beforeEach(() => {
      applyOidcEnv($provider.getEnv())
    })

    it('populates req.kauth for a valid bearer token', async () => {
      const oidc = reloadOidcModule()
      oidc.initOidc()
      const token = await $provider.issueAccessToken({
        preferred_username: 'alice',
        roles: ['SRE']
      })

      const result = await runMiddleware(oidc.getOidcMiddleware(), {
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth.grant.access_token.token).to.equal(token)
      expect(result.req.kauth.grant.access_token.content.preferred_username).to.equal('alice')
      expect(result.req.kauth.grant.access_token.content.roles).to.deep.equal(['SRE'])
    })

    it('leaves req.kauth unset for an invalid bearer token', async () => {
      const oidc = reloadOidcModule()
      oidc.initOidc()

      const result = await runMiddleware(oidc.getOidcMiddleware(), {
        headers: {
          authorization: 'Bearer not-a-valid-jwt'
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })

    it('passes through when Authorization header is missing', async () => {
      const oidc = reloadOidcModule()
      oidc.initOidc()

      const result = await runMiddleware(oidc.getOidcMiddleware(), {
        headers: {}
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })

    it('skips OIDC validation for agent routes', async () => {
      const oidc = reloadOidcModule()
      oidc.initOidc()

      const result = await runMiddleware(oidc.getOidcMiddleware(), {
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
