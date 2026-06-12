const { expect } = require('chai')
const sinon = require('sinon')
const { generateSecret, generateSync } = require('otplib')
const Errors = require('../../../src/helpers/errors')
const embeddedOidc = require('../../../src/config/embedded-oidc')
const AuthInteractionService = require('../../../src/services/auth-interaction-service')
const {
  snapshotOidcEnv,
  DEFAULT_TEST_PASSWORD,
  createEmbeddedAuthHarness,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')

describe('Auth interaction service', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('harness', async () => createEmbeddedAuthHarness($sandbox))
  def('interactionUid', () => 'interaction-test-uid')

  beforeEach(async () => {
    AuthInteractionService.resetInteractionStateForTests()
    await $harness

    $sandbox.stub(embeddedOidc, 'getEmbeddedProvider').returns({
      Interaction: {
        find: $sandbox.stub().callsFake(async (uid) => {
          if (uid !== $interactionUid) {
            return undefined
          }
          return {
            uid,
            exp: Math.floor(Date.now() / 1000) + 600,
            returnTo: 'https://controller.test/oidc/auth/test/resume',
            save: $sandbox.stub().resolves(),
            params: {
              client_id: 'controller',
              scope: 'openid profile email groups'
            }
          }
        })
      },
      cookieName: () => 'interaction',
      Grant: function Grant ({ accountId, clientId }) {
        this.accountId = accountId
        this.clientId = clientId
        this.scopes = []
        this.addOIDCScope = (scope) => {
          this.scopes.push(scope)
        }
        this.save = async () => 'grant-test-id'
      }
    })
  })

  afterEach(() => {
    AuthInteractionService.resetInteractionStateForTests()
    $sandbox.restore()
    teardownEmbeddedAuth($envSnapshot)
  })

  describe('resolveNextStep', () => {
    it('returns login when no verified user state exists', () => {
      expect(AuthInteractionService.resolveNextStep(null, null)).to.equal('login')
    })

    it('returns mfa for admin with MFA enabled after login', () => {
      const authContext = {
        user: { id: 'user-1', mustChangePassword: false, isBootstrap: false },
        groups: [{ name: 'admin' }],
        mfa: { enabled: true }
      }
      const state = { userId: 'user-1' }
      expect(AuthInteractionService.resolveNextStep(authContext, state)).to.equal('mfa')
    })

    it('returns enroll for admin without MFA enrollment', () => {
      const authContext = {
        user: { id: 'user-1', mustChangePassword: false, isBootstrap: false },
        groups: [{ name: 'admin' }],
        mfa: null
      }
      const state = { userId: 'user-1' }
      expect(AuthInteractionService.resolveNextStep(authContext, state)).to.equal('enroll')
    })

    it('returns change-password for viewer with mustChangePassword after login', () => {
      const authContext = {
        user: { id: 'user-1', mustChangePassword: true, isBootstrap: false },
        groups: [{ name: 'viewer' }],
        mfa: null
      }
      const state = { userId: 'user-1' }
      expect(AuthInteractionService.resolveNextStep(authContext, state)).to.equal('change-password')
    })

    it('returns complete for viewer after forced password change', () => {
      const authContext = {
        user: { id: 'user-1', mustChangePassword: false, isBootstrap: false },
        groups: [{ name: 'viewer' }],
        mfa: null
      }
      const state = { userId: 'user-1' }
      expect(AuthInteractionService.resolveNextStep(authContext, state)).to.equal('complete')
    })

    it('returns complete for viewer after login when password change is not required', () => {
      const authContext = {
        user: { id: 'user-1', mustChangePassword: false, isBootstrap: false },
        groups: [{ name: 'viewer' }],
        mfa: null
      }
      const state = { userId: 'user-1', passwordChanged: true }
      expect(AuthInteractionService.resolveNextStep(authContext, state)).to.equal('complete')
    })
  })

  describe('forced password interaction flow', () => {
    it('requires change-password before completion for temp password users', async () => {
      const { store } = await $harness
      await store.seedUser({
        email: 'temp@example.com',
        groupNames: ['viewer'],
        mustChangePassword: true
      })

      const loginResult = await AuthInteractionService.submitLogin($interactionUid, {
        email: 'temp@example.com',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      expect(loginResult.step).to.equal('change-password')

      const changeResult = await AuthInteractionService.submitChangePassword($interactionUid, {
        currentPassword: DEFAULT_TEST_PASSWORD,
        newPassword: 'NewSecurePass456!'
      }, false)

      expect(changeResult.step).to.equal('complete')

      const req = { headers: {} }
      const res = {}
      const completeResult = await AuthInteractionService.complete($interactionUid, req, res, false)
      expect(completeResult.step).to.equal('complete')
    })

    it('rejects completion before forced password change', async () => {
      const { store } = await $harness
      await store.seedUser({
        email: 'temp@example.com',
        groupNames: ['viewer'],
        mustChangePassword: true
      })

      await AuthInteractionService.submitLogin($interactionUid, {
        email: 'temp@example.com',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      try {
        await AuthInteractionService.complete($interactionUid, { headers: {} }, {}, false)
        expect.fail('expected completion to fail')
      } catch (error) {
        expect(error).to.be.instanceOf(Errors.ValidationError)
      }
    })
  })

  describe('interaction login flow', () => {
    it('returns complete for viewer after login', async () => {
      const { store } = await $harness
      await store.seedUser({
        email: 'viewer@example.com',
        groupNames: ['viewer']
      })

      const result = await AuthInteractionService.submitLogin($interactionUid, {
        email: 'viewer@example.com',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      expect(result.step).to.equal('complete')
    })

    it('returns mfa step for admin with MFA enabled', async () => {
      const { store } = await $harness
      const totpSecret = generateSecret()
      await store.seedUser({
        email: 'admin@example.com',
        groupNames: ['admin'],
        mfaEnabled: true,
        totpSecret
      })

      const result = await AuthInteractionService.submitLogin($interactionUid, {
        email: 'admin@example.com',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      expect(result.step).to.equal('mfa')
    })

    it('rejects invalid credentials with 401', async () => {
      const { store } = await $harness
      await store.seedUser({
        email: 'viewer@example.com',
        groupNames: ['viewer']
      })

      try {
        await AuthInteractionService.submitLogin($interactionUid, {
          email: 'viewer@example.com',
          password: 'wrong-password'
        }, false)
        expect.fail('expected login to fail')
      } catch (error) {
        expect(error).to.be.instanceOf(Errors.InvalidCredentialsError)
      }
    })

    it('completes interaction and returns OAuth resume URL after MFA', async () => {
      const { store } = await $harness
      const totpSecret = generateSecret()
      await store.seedUser({
        email: 'admin@example.com',
        groupNames: ['admin'],
        mfaEnabled: true,
        totpSecret
      })

      await AuthInteractionService.submitLogin($interactionUid, {
        email: 'admin@example.com',
        password: DEFAULT_TEST_PASSWORD
      }, false)

      const code = generateSync({ secret: totpSecret })
      const mfaResult = await AuthInteractionService.submitMfa($interactionUid, code, false)
      expect(mfaResult.step).to.equal('complete')

      const req = { headers: {} }
      const res = {}
      const completeResult = await AuthInteractionService.complete($interactionUid, req, res, false)

      expect(completeResult.step).to.equal('complete')
      expect(completeResult.redirectTo).to.equal('https://controller.test/oidc/auth/test/resume')
    })
  })
})
