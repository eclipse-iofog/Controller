const { expect } = require('chai')
const sinon = require('sinon')
const { generateSecret, generateSync } = require('otplib')
const Errors = require('../../../src/helpers/errors')
const {
  snapshotOidcEnv,
  DEFAULT_TEST_PASSWORD,
  EMBEDDED_PUBLIC_URL,
  EMBEDDED_CLIENT_ID,
  createEmbeddedAuthHarness,
  applyExternalEnv,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')
const { verifyEmbeddedAccessToken } = require('../../support/embedded-auth-smoke')

describe('Embedded auth integration', () => {
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

  describe('login and session', () => {
    it('issues tokens for a viewer user without MFA', async () => {
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
      expect(result.accessToken.split('.')).to.have.length(3)
      expect(result.refreshToken.split('.')).to.have.length(3)
    })

    it('issues tokens for admin users with MFA when totp is provided', async () => {
      const { store, modules } = await $harness
      const totpSecret = generateSecret()
      await store.seedUser({
        email: 'admin@example.com',
        groupNames: ['admin'],
        mfaEnabled: true,
        totpSecret
      })

      const code = generateSync({ secret: totpSecret })
      const result = await modules.UserService.login({
        email: 'admin@example.com',
        password: DEFAULT_TEST_PASSWORD,
        totp: code
      }, false)

      expect(result.accessToken).to.be.a('string').that.is.not.empty
      expect(result.refreshToken).to.be.a('string').that.is.not.empty
      expect(result.accessToken.split('.')).to.have.length(3)
      expect(result.refreshToken.split('.')).to.have.length(3)
    })

    it('rejects admin login without totp when MFA is enabled', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'admin@example.com',
        groupNames: ['admin'],
        mfaEnabled: true
      })

      try {
        await modules.UserService.login({
          email: 'admin@example.com',
          password: DEFAULT_TEST_PASSWORD,
          totp: ''
        }, false)
        expect.fail('expected login to fail')
      } catch (error) {
        expect(error).to.be.instanceOf(Errors.InvalidCredentialsError)
      }
    })

    it('allows bootstrap admin login without MFA', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'admin',
        groupNames: ['admin'],
        isBootstrap: true
      })

      const result = await modules.UserService.login({
        email: 'admin',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      expect(result.accessToken).to.be.a('string').that.is.not.empty
      expect(result.refreshToken).to.be.a('string').that.is.not.empty
      expect(result.accessToken.split('.')).to.have.length(3)
      expect(result.refreshToken.split('.')).to.have.length(3)
    })

    it('rejects non-bootstrap admin login when MFA is not enrolled', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'newadmin@example.com',
        groupNames: ['admin']
      })

      try {
        await modules.UserService.login({
          email: 'newadmin@example.com',
          password: DEFAULT_TEST_PASSWORD
        }, false)
        expect.fail('expected login to fail')
      } catch (error) {
        expect(error).to.be.instanceOf(Errors.InvalidCredentialsError)
      }
    })

    it('rotates refresh tokens', async () => {
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
      expect(refreshResult.accessToken.split('.')).to.have.length(3)
      expect(refreshResult.refreshToken.split('.')).to.have.length(3)
      expect(refreshResult.refreshToken).to.not.equal(loginResult.refreshToken)
    })

    it('validates issued access tokens via embedded JWKS', async () => {
      const { store, modules, signing } = await $harness
      await store.seedUser({
        email: 'viewer@example.com',
        groupNames: ['viewer']
      })

      const loginResult = await modules.UserService.login({
        email: 'viewer@example.com',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      const { payload } = await verifyEmbeddedAccessToken(loginResult.accessToken, {
        issuer: `${EMBEDDED_PUBLIC_URL}/oidc`,
        audience: EMBEDDED_CLIENT_ID,
        privateJwk: signing.privateJwk
      })

      expect(payload.email).to.equal('viewer@example.com')
      expect(payload.groups).to.deep.equal(['viewer'])
    })
  })

  describe('user admin', () => {
    it('creates, lists, updates, and soft-deletes users', async () => {
      const { modules } = await $harness

      const created = await modules.AuthUserService.createUser({
        email: 'new-user@example.com',
        password: DEFAULT_TEST_PASSWORD,
        groups: ['developer']
      })

      expect(created.email).to.equal('new-user@example.com')
      expect(created.groups).to.deep.equal(['developer'])
      expect(created.mustChangePassword).to.equal(true)

      const listed = await modules.AuthUserService.listUsers()
      expect(listed.map((user) => user.email)).to.include('new-user@example.com')

      const updated = await modules.AuthUserService.updateUser(created.id, {
        groups: ['sre']
      })
      expect(updated.groups).to.deep.equal(['sre'])

      await modules.AuthUserService.deleteUser(created.id)
      const afterDelete = await modules.AuthUserService.listUsers()
      expect(afterDelete.map((user) => user.email)).to.not.include('new-user@example.com')
    })
  })

  describe('migration export', () => {
    it('exports users and groups for external migration', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'viewer@example.com',
        groupNames: ['viewer']
      })

      const exportData = await modules.AuthMigrationService.exportMigrationData()

      expect(exportData.authMode).to.equal('embedded')
      expect(exportData.users).to.have.length(1)
      expect(exportData.users[0].email).to.equal('viewer@example.com')
      expect(exportData.users[0].groups).to.deep.equal(['viewer'])
      expect(exportData.groups.map((group) => group.name)).to.include.members(['admin', 'viewer'])
    })
  })

})

describe('Embedded auth external mode', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('modules', () => require('../../support/embedded-auth-harness').reloadAuthModules())

  beforeEach(() => {
    applyExternalEnv()
    require('../../support/embedded-auth-harness').reloadAuthModules()
  })

  afterEach(() => {
    $sandbox.restore()
    teardownEmbeddedAuth($envSnapshot)
  })

  it('returns 501 for embedded-only user admin APIs', () => {
    try {
      $modules.AuthUserService.ensureEmbeddedMode()
      expect.fail('expected NotImplementedError')
    } catch (error) {
      expect(error).to.be.instanceOf(Errors.NotImplementedError)
    }
  })

  it('returns 501 for migration export in external mode', async () => {
    try {
      await $modules.AuthMigrationService.exportMigrationData()
      expect.fail('expected NotImplementedError')
    } catch (error) {
      expect(error).to.be.instanceOf(Errors.NotImplementedError)
    }
  })
})
