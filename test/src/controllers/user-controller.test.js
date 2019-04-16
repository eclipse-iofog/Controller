const { expect } = require('chai')
const sinon = require('sinon')

const UserController = require('../../../src/controllers/user-controller')
const UserService = require('../../../src/services/user-service')
const AppHelper = require('../../../src/helpers/app-helper')
const Validator = require('../../../src/schemas')

describe('User Controller', () => {
  def('subject', () => UserController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  const error = 'Error!'

  describe('.userSignupEndPoint()', () => {
    def('firstName', () => 'firstName')
    def('lastName', () => 'lastName')
    def('email', () => 'test@gmail.com')
    def('password', () => 'testPassword')

    def('req', () => ({
      body: {
        firstName: $firstName,
        lastName: $lastName,

        email: $email,
        password: $password,
      },
    }))
    def('response', () => Promise.resolve())
    def('encryptedPassword', () => 'encryptedPassword')
    def('validatorResponse', () => Promise.resolve(true))
    def('encryptTextResponse', () => $encryptedPassword)
    def('subject', () => $subject.userSignupEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(AppHelper, 'encryptText').returns($encryptTextResponse)
      $sandbox.stub(UserService, 'signUp').returns($response)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith({
        firstName: $firstName,
        lastName: $lastName,
        email: $email,
        password: $password,
      }, Validator.schemas.signUp)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#encryptText() with correct args', async () => {
        await $subject
        expect(AppHelper.encryptText).to.have.been.calledWith($password, $email)
      })

      context('when AppHelper#encryptText() fails', () => {
        it('fails', () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })

      context('when AppHelper#encryptText() succeeds', () => {
        it('calls UserService.signUp with correct args', async () => {
          await $subject
          expect(UserService.signUp).to.have.been.calledWith({
            firstName: $firstName,
            lastName: $lastName,
            email: $email,
            password: $encryptedPassword,
          }, false)
        })

        context('when UserService#signUp fails', () => {
          const error = 'Error!'

          def('response', () => Promise.reject(error))

          it(`fails with "${error}"`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when UserService#signUp succeeds', () => {
          it(`succeeds`, () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })
      })
    })
  })

  describe('.userLoginEndPoint()', () => {
    def('email', () => 'test@gmail.com')
    def('password', () => 'testPassword')

    def('req', () => ({
      body: {
        email: $email,
        password: $password,
      },
    }))
    def('response', () => Promise.resolve())
    def('validatorResponse', () => Promise.resolve(true))
    def('subject', () => $subject.userLoginEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(UserService, 'login').returns($response)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith({
        email: $email,
        password: $password,
      }, Validator.schemas.login)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls UserService.login with correct args', async () => {
        await $subject
        expect(UserService.login).to.have.been.calledWith({
          email: $email,
          password: $password,
        }, false)
      })

      context('when UserService#login fails', () => {
        const error = 'Error!'

        def('response', () => Promise.reject(error))

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when UserService#login succeeds', () => {
        it(`succeeds`, () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })
    })
  })

  describe('.resendActivationEndPoint()', () => {
    def('email', () => 'test@gmail.com')

    def('req', () => ({
      query: {
        email: $email,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.resendActivationEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(UserService, 'resendActivation').returns($response)
    })

    it('calls UserService.resendActivation with correct args', async () => {
      await $subject
      expect(UserService.resendActivation).to.have.been.calledWith({
        email: $email,
      }, false)
    })

    context('when UserService#resendActivation fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when UserService#resendActivation succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.activateUserAccountEndPoint()', () => {
    def('activationCode', () => 'testActivationCode')

    def('req', () => ({
      body: {
        activationCode: $activationCode,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.activateUserAccountEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(UserService, 'activateUser').returns($response)
    })

    it('calls UserService.activateUser with correct args', async () => {
      await $subject
      expect(UserService.activateUser).to.have.been.calledWith({
        activationCode: $activationCode,
      }, false)
    })

    context('when UserService#activateUser fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when UserService#activateUser succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.userLogoutEndPoint()', () => {
    def('activationCode', () => 'testActivationCode')
    def('user', () => 'user!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.userLogoutEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(UserService, 'logout').returns($response)
    })

    it('calls UserService.logout with correct args', async () => {
      await $subject
      expect(UserService.logout).to.have.been.calledWith($user, false)
    })

    context('when UserService#logout fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when UserService#logout succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getUserProfileEndPoint()', () => {
    def('user', () => 'user!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getUserProfileEndPoint($req, $user))

    it(`succeeds`, () => {
      return expect($subject).to.eventually.include.all.keys(['firstName', 'lastName', 'email'])
    })
  })

  describe('.updateUserProfileEndPoint()', () => {
    def('firstName', () => 'firstName2')
    def('lastName', () => 'lastName2')
    def('user', () => 'user!')

    def('req', () => ({
      body: {
        firstName: $firstName,
        lastName: $lastName,
      },
    }))
    def('profileData', () => $req.body)
    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateUserProfileEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(UserService, 'updateUserDetails').returns($response)
    })

    it('calls UserService.updateUserDetails with correct args', async () => {
      await $subject
      expect(UserService.updateUserDetails).to.have.been.calledWith($user, $profileData, false)
    })

    context('when UserService#updateUserDetails fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when UserService#updateUserDetails succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.deleteUserProfileEndPoint()', () => {
    def('user', () => 'user!')

    def('req', () => ({
      body: {
        force: true,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.deleteUserProfileEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(UserService, 'deleteUser').returns($response)
    })

    it('calls UserService.deleteUser with correct args', async () => {
      await $subject
      expect(UserService.deleteUser).to.have.been.calledWith(true, $user, false)
    })

    context('when UserService#deleteUser fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when UserService#deleteUser succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.updateUserPasswordEndPoint()', () => {
    def('user', () => 'user!')

    def('oldPassword', () => 'oldPassword')
    def('newPassword', () => 'newPassword')

    def('req', () => ({
      body: {
        oldPassword: $oldPassword,
        newPassword: $newPassword,
      },
    }))
    def('response', () => Promise.resolve())
    def('validatorResponse', () => Promise.resolve(true))
    def('subject', () => $subject.updateUserPasswordEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(UserService, 'updateUserPassword').returns($response)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith({
        oldPassword: $oldPassword,
        newPassword: $newPassword,
      }, Validator.schemas.updatePassword)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls UserService.updateUserPassword with correct args', async () => {
        await $subject
        expect(UserService.updateUserPassword).to.have.been.calledWith({
          oldPassword: $oldPassword,
          newPassword: $newPassword,
        }, $user, false)
      })

      context('when UserService#updateUserPassword fails', () => {
        const error = 'Error!'

        def('response', () => Promise.reject(error))

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when UserService#updateUserPassword succeeds', () => {
        it(`succeeds`, () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })
    })
  })

  describe('.resetUserPasswordEndPoint()', () => {
    def('user', () => 'user!')

    def('email', () => 'test@gmail.com')

    def('req', () => ({
      body: {
        email: $email,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.resetUserPasswordEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(UserService, 'resetUserPassword').returns($response)
    })

    it('calls UserService.resetUserPassword with correct args', async () => {
      await $subject
      expect(UserService.resetUserPassword).to.have.been.calledWith({
        email: $email,
      }, false)
    })

    context('when UserService#resetUserPassword fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when UserService#resetUserPassword succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
