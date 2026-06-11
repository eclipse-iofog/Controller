const { expect } = require('chai')
const sinon = require('sinon')

const {
  snapshotOidcEnv,
  DEFAULT_TEST_PASSWORD,
  createEmbeddedAuthHarness,
  teardownEmbeddedAuth,
  applyEmbeddedEnv,
  reloadAuthModules
} = require('../../support/embedded-auth-harness')
const { applyOidcEnv, reloadOidcModule } = require('../../support/oidc-test-helpers')

describe('User service OIDC', () => {
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

  describe('embedded login()', () => {
    it('returns access and refresh tokens for valid credentials', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'viewer@example.com',
        groupNames: ['viewer']
      })

      const result = await modules.UserService.login({
        email: 'viewer@example.com',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      expect(result.accessToken).to.be.a('string').that.is.not.empty
      expect(result.refreshToken).to.be.a('string').that.is.not.empty
    })

    it('throws InvalidCredentialsError for bad password', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'viewer@example.com',
        groupNames: ['viewer']
      })

      try {
        await modules.UserService.login({
          email: 'viewer@example.com',
          password: 'wrong-password'
        }, false)
        expect.fail('expected login to fail')
      } catch (error) {
        expect(error.name).to.equal('InvalidCredentialsError')
      }
    })
  })

  describe('embedded refresh()', () => {
    it('returns a new access token for a valid refresh token', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'viewer@example.com',
        groupNames: ['viewer']
      })

      const loginResult = await modules.UserService.login({
        email: 'viewer@example.com',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      const refreshResult = await modules.UserService.refresh({
        refreshToken: loginResult.refreshToken
      }, false)

      expect(refreshResult.accessToken).to.be.a('string').that.is.not.empty
      expect(refreshResult.refreshToken).to.be.a('string').that.is.not.empty
    })
  })

  describe('embedded profile()', () => {
    it('returns JWT claims for a valid bearer token', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'viewer@example.com',
        groupNames: ['viewer']
      })

      const loginResult = await modules.UserService.login({
        email: 'viewer@example.com',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      const profile = await modules.UserService.profile({
        headers: {
          authorization: `Bearer ${loginResult.accessToken}`
        }
      }, false)

      expect(profile.preferred_username).to.equal('viewer@example.com')
      expect(profile.email).to.equal('viewer@example.com')
      expect(profile.groups).to.deep.equal(['viewer'])
    })
  })

  describe('embedded logout()', () => {
    it('returns success after revoking refresh tokens', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'viewer@example.com',
        groupNames: ['viewer']
      })

      const loginResult = await modules.UserService.login({
        email: 'viewer@example.com',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      const result = await modules.UserService.logout({
        headers: {
          authorization: `Bearer ${loginResult.accessToken}`
        }
      }, false)

      expect(result).to.deep.equal({ status: 'success' })
    })
  })

  describe('without auth config', () => {
    beforeEach(() => {
      applyOidcEnv({})
      reloadOidcModule()
    })

    it('throws when auth is not configured', async () => {
      const { UserService } = reloadAuthModules()
      try {
        await UserService.login({
          email: 'dev@example.com',
          password: 'password'
        }, false)
        expect.fail('expected login to fail')
      } catch (error) {
        expect(error.message).to.include('Auth is not configured')
      }
    })
  })
})
