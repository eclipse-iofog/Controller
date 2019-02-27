const {expect} = require('chai')
const sinon = require('sinon')

const UserManager = require('../../../src/sequelize/managers/user-manager')
const UserService = require('../../../src/services/user-service')
const Config = require('../../../src/config')
const AccessTokenService = require('../../../src/services/access-token-service')
const Validator = require('../../../src/schemas')
const AppHelper = require('../../../src/helpers/app-helper')
const ioFogManager = require('../../../src/sequelize/managers/iofog-manager')
const EmailActivationCodeService = require('../../../src/services/email-activation-code-service')
const nodemailer = require('nodemailer')

describe('User Service', () => {
  def('subject', () => UserService)
  def('sandbox', () => sinon.createSandbox())

  const isCLI = false

  afterEach(() => $sandbox.restore())

  describe('.signUp()', () => {
    const transaction = {}
    const error = 'Error!'

    const newUser = {
      id: 16,
      firstName: 'testFirstName',
      lastName: 'testLastName',
      email: 'testEmail',
      emailActivated: true,
    }

    const response = {
      userId: 16,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      emailActivated: newUser.emailActivated,
    }

    def('subject', () => $subject.signUp(newUser, isCLI, transaction))
    def('configGetResponse', () => false)
    def('findUserResponse', () => Promise.resolve())
    def('createUserResponse', () => Promise.resolve(newUser))

    beforeEach(() => {
      $sandbox.stub(Config, 'get').returns($configGetResponse)
      $sandbox.stub(UserManager, 'findOne').returns($findUserResponse)
      $sandbox.stub(UserManager, 'create').returns($createUserResponse)
    })

    it('calls Config#get() with correct args', async () => {
      await $subject
      expect(Config.get).to.have.been.calledWith('Email:ActivationEnabled')
    })

    context('when Config#get() succeeds', () => {
      it('calls UserManager#findOne() with correct args', async () => {
        await $subject
        expect(UserManager.findOne).to.have.been.calledWith({
          email: newUser.email,
        }, transaction)
      })

      context('when UserManager#findOne() fails', () => {
        def('findUserResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when UserManager#findOne() succeeds', () => {
        it('calls UserManager#create() with correct args', async () => {
          await $subject
          expect(UserManager.create).to.have.been.calledWith(newUser, transaction)
        })

        context('when UserManager#create() fails', () => {
          def('createUserResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when UserManager#create() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.deep.equal(response)
          })
        })
      })
    })
  })

  describe('.login()', () => {
    const transaction = {}
    const error = 'Error!'

    const credentials = {
      email: 'testEmail',
      password: 'testPassword',
    }

    const user = {
      email: 'testEmail',
      password: 'testPassword',
      id: 15,
    }

    const testAccessToken = 'testAccessToken'

    const configGet2 = 155
    const date = 1555
    const tokenExpireTime = date + (configGet2 * 1000)

    const createToken = {
      token: testAccessToken,
      expirationTime: tokenExpireTime,
      userId: user.id,
    }


    def('subject', () => $subject.login(credentials, isCLI, transaction))
    def('findUserResponse', () => Promise.resolve(user))
    def('decryptTextResponse', () => credentials.password)
    def('getConfigResponse', () => false)
    def('getConfigResponse2', () => configGet2)
    def('generateAccessTokenResponse', () => 'testAccessToken')
    def('findByAccessTokenResponse', () => false)
    def('createAccessTokenResponse', () => Promise.resolve({
      token: 'token',
    }))
    def('dateResponse', () => date)

    beforeEach(() => {
      $sandbox.stub(UserManager, 'findOne').returns($findUserResponse)
      $sandbox.stub(AppHelper, 'decryptText').returns($decryptTextResponse)
      $sandbox.stub(Config, 'get')
          .onFirstCall().returns($getConfigResponse)
          .onSecondCall().returns($getConfigResponse2)
      $sandbox.stub(AppHelper, 'generateAccessToken').returns($generateAccessTokenResponse)
      $sandbox.stub(UserManager, 'findByAccessToken').returns($findByAccessTokenResponse)
      $sandbox.stub(AccessTokenService, 'createAccessToken').returns($createAccessTokenResponse)
      $sandbox.stub(Date.prototype, 'getTime').returns($dateResponse)
    })

    it('calls UserManager#findOne() with correct args', async () => {
      await $subject
      expect(UserManager.findOne).to.have.been.calledWith({
        email: credentials.email,
      }, transaction)
    })

    context('when UserManager#findOne() fails', () => {
      def('findUserResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when UserManager#findOne() succeeds', () => {
      it('calls AppHelper#decryptText() with correct args', async () => {
        await $subject
        expect(AppHelper.decryptText).to.have.been.calledWith(user.password, user.email)
      })

      context('when AppHelper#decryptText() fails', () => {
        const err = 'Invalid credentials'
        def('decryptTextResponse', () => Promise.reject(err))

        it(`fails with ${err}`, () => {
          return expect($subject).to.be.rejectedWith(err)
        })
      })

      context('when AppHelper#decryptText() succeeds', () => {
        it('calls Config#get() with correct args', async () => {
          await $subject
          expect(Config.get).to.have.been.calledWith('Email:ActivationEnabled')
        })

        context('when Config#get() fails', () => {
          const err = 'Email is not activated. Please activate your account first.'
          def('getConfigResponse', () => Promise.reject(err))

          it(`fails with ${err}`, () => {
            return expect($subject).to.be.rejectedWith(err)
          })
        })

        context('when Config#get() succeeds', () => {
          it('calls AppHelper#generateAccessToken() with correct args', async () => {
            await $subject
            expect(AppHelper.generateAccessToken).to.have.been.calledWith()
          })

          context('when AppHelper#generateAccessToken() fails', () => {
            def('generateAccessTokenResponse', () => error)

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.have.property('accessToken')
            })
          })

          context('when AppHelper#generateAccessToken() succeeds', () => {
            it('calls UserManager#findByAccessToken() with correct args', async () => {
              await $subject
              expect(UserManager.findByAccessToken).to.have.been.calledWith(testAccessToken, transaction)
            })

            context('when UserManager#findByAccessToken() fails', () => {
              def('findByAccessTokenResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when UserManager#findByAccessToken() succeeds', () => {
              it('calls Config#get() with correct args', async () => {
                await $subject
                expect(Config.get).to.have.been.calledWith('Settings:UserTokenExpirationIntervalSeconds')
              })

              context('when Config#get() fails', () => {
                def('getConfigResponse2', () => error)

                it(`fails with ${error}`, () => {
                  return expect($subject).to.eventually.have.property('accessToken')
                })
              })

              context('when Config#get() succeeds', () => {
                it('calls AccessTokenService#createAccessToken() with correct args', async () => {
                  await $subject
                  expect(AccessTokenService.createAccessToken).to.have.been.calledWith(createToken, transaction)
                })

                context('when AccessTokenService#createAccessToken() fails', () => {
                  def('createAccessTokenResponse', () => Promise.reject(error))

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.be.rejectedWith(error)
                  })
                })

                context('when AccessTokenService#createAccessToken() succeeds', () => {
                  it('fulfills the promise', () => {
                    return expect($subject).to.eventually.have.property('accessToken')
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  describe('.resendActivation()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      email: 'testEmail',
      password: 'testPassword',
      id: 15,
    }

    const emailObj = {
      email: 'testEmail',
    }

    const activationCodeData = {}

    const mailer = {
      sendMail: function(options) {
      },
    }

    def('subject', () => $subject.resendActivation(emailObj, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findUserResponse', () => Promise.resolve(user))
    def('generateActivationCodeResponse', () => Promise.resolve({}))
    def('saveActivationCodeResponse', () => Promise.resolve())
    def('getEmailAddressResponse', () => 'test@test.com')
    def('getEmailPasswordResponse', () => 'test')
    def('getEmailServiceResponse', () => 'SendGrid')
    def('getEmailHomeUrlResponse', () => 'test')
    def('decryptTextResponse', () => 'test')
    def('createTransportResponse', () => mailer)
    def('sendMailResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(UserManager, 'findOne').returns($findUserResponse)
      $sandbox.stub(EmailActivationCodeService, 'generateActivationCode').returns($generateActivationCodeResponse)
      $sandbox.stub(EmailActivationCodeService, 'saveActivationCode').returns($saveActivationCodeResponse)
      $sandbox.stub(Config, 'get')
          .onCall(0).returns($getEmailAddressResponse)
          .onCall(1).returns($getEmailPasswordResponse)
          .onCall(2).returns($getEmailAddressResponse)
          .onCall(3).returns($getEmailServiceResponse)
          .onCall(4).returns($getEmailHomeUrlResponse)
      $sandbox.stub(AppHelper, 'decryptText').returns($decryptTextResponse)
      $sandbox.stub(nodemailer, 'createTransport').returns($createTransportResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(emailObj, Validator.schemas.resendActivation)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls UserManager#findOne() with correct args', async () => {
        await $subject
        expect(UserManager.findOne).to.have.been.calledWith(emailObj, transaction)
      })

      context('when UserManager#findOne() fails', () => {
        def('findUserResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when UserManager#findOne() succeeds', () => {
        it('calls EmailActivationCodeService#generateActivationCode() with correct args', async () => {
          await $subject
          expect(EmailActivationCodeService.generateActivationCode).to.have.been.calledWith(transaction)
        })
        context('when EmailActivationCodeService#generateActivationCode() fails', () => {
          def('generateActivationCodeResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when EmailActivationCodeService#generateActivationCode() succeeds', () => {
          it('calls EmailActivationCodeService#saveActivationCode() with correct args', async () => {
            await $subject
            expect(EmailActivationCodeService.saveActivationCode).to.have.been.calledWith(
                user.id,
                activationCodeData,
                transaction)
          })

          context('when EmailActivationCodeService#saveActivationCode() fails', () => {
            def('saveActivationCodeResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when EmailActivationCodeService#saveActivationCode() succeeds', () => {
            it('calls Config#get() with correct args', async () => {
              await $subject
              expect(Config.get).to.have.been.calledWith('Email:Address')
            })

            context('when Config#get() fails', () => {
              def('getEmailAddressResponse', Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.eventually.equal(undefined)
              })
            })
            context('when Config#get() succeeds', () => {
              it('calls Config#get() with correct args', async () => {
                await $subject
                expect(Config.get).to.have.been.calledWith('Email:Password')
              })

              context('when Config#get() fails', () => {
                def('getEmailPasswordResponse', () => error)

                it(`fails with ${error}`, () => {
                  return expect($subject).to.eventually.equal(undefined)
                })
              })
              context('when Config#get() succeeds', () => {
                it('calls Config#get() with correct args', async () => {
                  await $subject
                  expect(Config.get).to.have.been.calledWith('Email:Address')
                })

                context('when Config#get() fails', () => {
                  def('getEmailAddressResponse', () => error)

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.eventually.equal(undefined)
                  })
                })
                context('when Config#get() succeeds', () => {
                  it('calls Config#get() with correct args', async () => {
                    await $subject
                    expect(Config.get).to.have.been.calledWith('Email:Service')
                  })

                  context('when Config#get() fails', () => {
                    def('getEmailServiceResponse', () => error)

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.eventually.equal(undefined)
                    })
                  })
                  context('when Config#get() succeeds', () => {
                    it('fulfills the promise', () => {
                      return expect($subject).to.eventually.equal(undefined)
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })


  describe('.activateUser()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      email: 'testEmail',
      password: 'testPassword',
      id: 15,
    }

    const updatedObj = {
      emailActivated: true,
    }

    const codeData = {
      activationCode: 'testActivationCode',
    }

    def('subject', () => $subject.activateUser(codeData, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('verifyActivationCodeResponse', () => Promise.resolve({
      userId: user.id,
    }))
    def('updateUserResponse', () => Promise.resolve())
    def('deleteActivationCodeResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(EmailActivationCodeService, 'verifyActivationCode').returns($verifyActivationCodeResponse)
      $sandbox.stub(UserManager, 'update').returns($updateUserResponse)
      $sandbox.stub(EmailActivationCodeService, 'deleteActivationCode').returns($deleteActivationCodeResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(codeData, Validator.schemas.activateUser)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls EmailActivationCodeService#verifyActivationCode() with correct args', async () => {
        await $subject
        expect(EmailActivationCodeService.verifyActivationCode).to.have.been.calledWith(codeData.activationCode, transaction)
      })

      context('when EmailActivationCodeService#verifyActivationCode() fails', () => {
        def('verifyActivationCodeResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when EmailActivationCodeService#verifyActivationCode() succeeds', () => {
        it('calls UserManager#update() with correct args', async () => {
          await $subject
          expect(UserManager.update).to.have.been.calledWith({
            id: user.id,
          }, updatedObj, transaction)
        })

        context('when UserManager#update() fails', () => {
          const err = 'User not updated'
          def('updateUserResponse', () => Promise.reject(err))

          it(`fails with ${err}`, () => {
            return expect($subject).to.be.rejectedWith(err)
          })
        })

        context('when UserManager#update() succeeds', () => {
          it('calls EmailActivationCodeService#deleteActivationCode() with correct args', async () => {
            await $subject
            expect(EmailActivationCodeService.deleteActivationCode).to.have.been.calledWith(codeData.activationCode,
                transaction)
          })

          context('when EmailActivationCodeService#deleteActivationCode() fails', () => {
            def('deleteActivationCodeResponse', () => error)

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })

          context('when EmailActivationCodeService#deleteActivationCode() succeeds', () => {
            it('fulfills the promise', () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })
        })
      })
    })
  })

  describe('.logout()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    def('subject', () => $subject.logout(user, isCLI, transaction))
    def('removeAccessTokenResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(AccessTokenService, 'removeAccessTokenByUserId').returns($removeAccessTokenResponse)
    })

    it('calls AccessTokenService#removeAccessTokenByUserId() with correct args', async () => {
      await $subject
      expect(AccessTokenService.removeAccessTokenByUserId).to.have.been.calledWith(user.id, transaction)
    })

    context('when AccessTokenService#removeAccessTokenByUserId() fails', () => {
      def('removeAccessTokenResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AccessTokenService#removeAccessTokenByUserId() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.updateUserDetails()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      email: 'testEmail',
      password: 'testPassword',
      id: 15,
    }

    const profileData = {
      firstName: 'testFirstName',
      lastName: 'testLastName',
    }

    def('subject', () => $subject.updateUserDetails(user, profileData, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('deleteUndefinedFieldsResponse', () => profileData)
    def('updateDetailsResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(UserManager, 'updateDetails').returns($updateDetailsResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(profileData, Validator.schemas.updateUserProfile)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
        await $subject
        expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(profileData)
      })

      context('when AppHelper#deleteUndefinedFields() fails', () => {
        def('deleteUndefinedFieldsResponse', () => error)

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.have.property('firstName')
        })
      })

      context('when AppHelper#deleteUndefinedFields() succeeds', () => {
        it('calls UserManager#updateDetails() with correct args', async () => {
          await $subject
          expect(UserManager.updateDetails).to.have.been.calledWith(user, profileData, transaction)
        })

        context('when UserManager#updateDetails() fails', () => {
          def('updateUserResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.have.property('firstName')
          })
        })

        context('when UserManager#updateDetails() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.have.property('firstName')
          })
        })
      })
    })
  })

  describe('.deleteUser()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      email: 'testEmail',
      password: 'testPassword',
      id: 15,
    }

    const profileData = {
      firstName: 'testFirstName',
      lastName: 'testLastName',
    }

    const force = false

    def('subject', () => $subject.deleteUser(force, user, isCLI, transaction))
    def('findAllResponse', () => Promise.resolve([{}]))
    def('deleteUserResponse', () => profileData)

    beforeEach(() => {
      $sandbox.stub(ioFogManager, 'findAll').returns($findAllResponse)
      $sandbox.stub(UserManager, 'delete').returns($deleteUserResponse)
    })

    it('calls ioFogManager#findAll() with correct args', async () => {
      await $subject
      expect(ioFogManager.findAll).to.have.been.calledWith({
        userId: user.id,
      }, transaction)
    })

    context('when ioFogManager#findAll() fails', () => {
      def('findAllResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogManager#findAll() succeeds', () => {
      it('calls UserManager#delete() with correct args', async () => {
        await $subject
        expect(UserManager.delete).to.have.been.calledWith({
          id: user.id,
        }, transaction)
      })

      context('when UserManager#delete() fails', () => {
        def('deleteUserResponse', () => error)

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })

      context('when UserManager#delete() succeeds', () => {
        it('fulfills the promise', () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })
    })
  })

  // TODO updateUserPassword, resetUserPassword with rewire

  describe('.list()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const response = [{
      id: user.id,
    }]

    const attributes = {exclude: ['password']}

    def('subject', () => $subject.list(isCLI, transaction))
    def('findAllResponse', () => Promise.resolve(response))

    beforeEach(() => {
      $sandbox.stub(UserManager, 'findAllWithAttributes').returns($findAllResponse)
    })

    it('calls UserManager#findAllWithAttributes() with correct args', async () => {
      await $subject
      expect(UserManager.findAllWithAttributes).to.have.been.calledWith({}, attributes, transaction)
    })

    context('when UserManager#findAllWithAttributes() fails', () => {
      def('findAllResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when UserManager#findAllWithAttributes() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.equal(response)
      })
    })
  })

  describe('.suspendUser()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const updatedObj = {
      emailActivated: false,
    }

    def('subject', () => $subject.suspendUser(user, isCLI, transaction))
    def('removeAccessTokenResponse', () => Promise.resolve())
    def('updateUserResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(AccessTokenService, 'removeAccessTokenByUserId').returns($removeAccessTokenResponse)
      $sandbox.stub(UserManager, 'update').returns($updateUserResponse)
    })

    it('calls AccessTokenService#removeAccessTokenByUserId() with correct args', async () => {
      await $subject
      expect(AccessTokenService.removeAccessTokenByUserId).to.have.been.calledWith(user.id, transaction)
    })

    context('when AccessTokenService#removeAccessTokenByUserId() fails', () => {
      def('removeAccessTokenResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AccessTokenService#removeAccessTokenByUserId() succeeds', () => {
      it('calls UserManager#update() with correct args', async () => {
        await $subject
        expect(UserManager.update).to.have.been.calledWith({
          id: user.id,
        }, updatedObj, transaction)
      })

      context('when UserManager#update() fails', () => {
        def('removeAccessTokenResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when UserManager#update() succeeds', () => {
        it('fulfills the promise', () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })
    })
  })
})
