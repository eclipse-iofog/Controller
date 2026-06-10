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
  reloadOidcModule
} = require('../../support/oidc-test-helpers')

function reloadUserServiceModule () {
  const userServicePath = require.resolve('../../../src/services/user-service')
  delete require.cache[userServicePath]
  return require('../../../src/services/user-service')
}

describe('User service OIDC', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('provider', () => new MockOidcProvider())

  beforeEach(async () => {
    enableMockOidcTls()
    await $provider.start()
    applyOidcEnv($provider.getEnv())
    reloadOidcModule()
  })

  afterEach(async () => {
    $sandbox.restore()
    restoreOidcEnv($envSnapshot)
    restoreMockOidcTls()
    await $provider.stop()
  })

  describe('login()', () => {
    it('returns access and refresh tokens from the issuer token endpoint', async () => {
      const UserService = reloadUserServiceModule()
      const result = await UserService.login({
        email: $provider.username,
        password: $provider.password
      }, false)

      expect(result.accessToken).to.be.a('string').that.is.not.empty
      expect(result.refreshToken).to.be.a('string').that.is.not.empty
    })

    it('throws InvalidCredentialsError for bad password', async () => {
      const UserService = reloadUserServiceModule()
      try {
        await UserService.login({
          email: $provider.username,
          password: 'wrong-password'
        }, false)
        expect.fail('expected login to fail')
      } catch (error) {
        expect(error.name).to.equal('InvalidCredentialsError')
      }
    })
  })

  describe('refresh()', () => {
    it('returns a new access token for a valid refresh token', async () => {
      const UserService = reloadUserServiceModule()
      const loginResult = await UserService.login({
        email: $provider.username,
        password: $provider.password
      }, false)

      const refreshResult = await UserService.refresh({
        refreshToken: loginResult.refreshToken
      }, false)

      expect(refreshResult.accessToken).to.be.a('string').that.is.not.empty
      expect(refreshResult.refreshToken).to.be.a('string').that.is.not.empty
    })
  })

  describe('profile()', () => {
    it('returns userinfo claims for a valid bearer token', async () => {
      const UserService = reloadUserServiceModule()
      const loginResult = await UserService.login({
        email: $provider.username,
        password: $provider.password
      }, false)

      const profile = await UserService.profile({
        headers: {
          authorization: `Bearer ${loginResult.accessToken}`
        }
      }, false)

      expect(profile.preferred_username).to.equal($provider.username)
      expect(profile.email).to.equal(`${$provider.username}@example.com`)
    })
  })

  describe('logout()', () => {
    it('returns success after best-effort token revocation', async () => {
      const UserService = reloadUserServiceModule()
      const loginResult = await UserService.login({
        email: $provider.username,
        password: $provider.password
      }, false)

      const result = await UserService.logout({
        headers: {
          authorization: `Bearer ${loginResult.accessToken}`
        }
      }, false)

      expect(result).to.deep.equal({ status: 'success' })
    })
  })

  describe('dev mode without auth config', () => {
    beforeEach(() => {
      applyOidcEnv({})
      reloadOidcModule()
    })

    it('returns mock tokens when auth is not configured', async () => {
      const originalGet = config.get.bind(config)
      $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
        if (key === 'server.devMode') {
          return true
        }
        return originalGet(key, defaultValue)
      })

      const UserService = reloadUserServiceModule()
      const result = await UserService.login({
        email: 'dev@example.com',
        password: 'password'
      }, false)

      expect(result.accessToken).to.equal('mock-access-token')
      expect(result.refreshToken).to.equal('mock-refresh-token')
    })
  })
})
