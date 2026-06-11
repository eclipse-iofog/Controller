const { expect } = require('chai')
const sinon = require('sinon')

const UserController = require('../../../src/controllers/user-controller')
const UserService = require('../../../src/services/user-service')
const Validator = require('../../../src/schemas')

describe('User Controller', () => {
  def('controller', () => UserController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.userLoginEndPoint()', () => {
    def('email', () => 'test@gmail.com')
    def('password', () => 'testPassword')
    def('totp', () => '123456')

    def('req', () => ({
      body: {
        email: $email,
        password: $password,
        totp: $totp
      }
    }))

    def('subject', () => $controller.userLoginEndPoint($req))
    def('response', () => Promise.resolve({ accessToken: 'token' }))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(UserService, 'login').returns($response)
    })

    it('validates credentials and delegates to UserService.login', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith($req.body, Validator.schemas.login)
      expect(UserService.login).to.have.been.calledWith({
        email: $email,
        password: $password,
        totp: $totp
      }, false)
    })

    context('when validation fails', () => {
      beforeEach(() => {
        Validator.validate.rejects(new Error('invalid login'))
      })

      it('rejects without calling login', () => {
        return expect($subject).to.be.rejectedWith('invalid login').then(() => {
          expect(UserService.login).to.not.have.been.called
        })
      })
    })
  })

  describe('.refreshTokenEndPoint()', () => {
    def('refreshToken', () => 'refresh-token-value')

    def('req', () => ({
      body: { refreshToken: $refreshToken }
    }))

    def('subject', () => $controller.refreshTokenEndPoint($req))
    def('response', () => Promise.resolve({ accessToken: 'new-token' }))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(UserService, 'refresh').returns($response)
    })

    it('validates and refreshes tokens', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith($req.body, Validator.schemas.refresh)
      expect(UserService.refresh).to.have.been.calledWith({ refreshToken: $refreshToken }, false)
    })
  })

  describe('.getUserProfileEndPoint()', () => {
    def('req', () => ({
      headers: { authorization: 'Bearer access-token' }
    }))

    def('profile', () => ({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@gmail.com'
    }))

    def('subject', () => $controller.getUserProfileEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(UserService, 'profile').resolves($profile)
    })

    it('returns the user profile from UserService.profile', async () => {
      const result = await $subject
      expect(UserService.profile).to.have.been.calledWith($req, false)
      expect(result).to.eql($profile)
    })
  })

  describe('.userLogoutEndPoint()', () => {
    def('req', () => ({
      headers: { authorization: 'Bearer access-token' },
      body: {}
    }))

    def('subject', () => $controller.userLogoutEndPoint($req))
    def('logoutResult', () => ({ status: 'success' }))

    beforeEach(() => {
      $sandbox.stub(UserService, 'logout').resolves($logoutResult)
    })

    it('delegates logout to UserService', async () => {
      const result = await $subject
      expect(UserService.logout).to.have.been.calledWith($req, false)
      expect(result).to.eql($logoutResult)
    })
  })

  describe('.changePasswordEndPoint()', () => {
    def('payload', () => ({
      oldPassword: 'old-password',
      newPassword: 'new-password'
    }))

    def('req', () => ({
      body: $payload,
      kauth: { grant: { access_token: { content: { sub: 'user-id' } } } }
    }))

    def('subject', () => $controller.changePasswordEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(UserService, 'changePassword').resolves({ status: 'success' })
    })

    it('validates payload and delegates password change', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith($payload, Validator.schemas.changePassword)
      expect(UserService.changePassword).to.have.been.calledWith($req, $payload, false)
    })
  })

  describe('.enrollMfaEndPoint()', () => {
    def('req', () => ({
      kauth: { grant: { access_token: { content: { sub: 'user-id' } } } }
    }))

    def('subject', () => $controller.enrollMfaEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(UserService, 'enrollMfa').resolves({ secret: 'otp-secret' })
    })

    it('delegates MFA enrollment to UserService', async () => {
      await $subject
      expect(UserService.enrollMfa).to.have.been.calledWith($req, false)
    })
  })

  describe('.interactionLoginEndPoint()', () => {
    def('uid', () => 'interaction-uid')
    def('email', () => 'test@gmail.com')
    def('password', () => 'testPassword')

    def('req', () => ({
      params: { uid: $uid },
      body: { email: $email, password: $password }
    }))

    def('subject', () => $controller.interactionLoginEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(UserService, 'interactionLogin').resolves({ status: 'ok' })
    })

    it('validates and submits interaction login', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith($req.body, Validator.schemas.interactionLogin)
      expect(UserService.interactionLogin).to.have.been.calledWith(
        $uid,
        { email: $email, password: $password },
        false
      )
    })
  })

  describe('.oauthAuthorizeEndPoint()', () => {
    def('req', () => ({ query: { redirect_uri: 'https://console.example/login' } }))
    def('subject', () => $controller.oauthAuthorizeEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(UserService, 'oauthAuthorize').resolves({ redirect: '/oidc/auth' })
    })

    it('delegates OAuth authorize to UserService', async () => {
      await $subject
      expect(UserService.oauthAuthorize).to.have.been.calledWith($req, false)
    })
  })
})
