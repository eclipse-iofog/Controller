const {expect} = require('chai')
const sinon = require('sinon')

const EmailActivationCodeManager = require('../../../src/sequelize/managers/email-activation-code-manager')
const EmailActivationCodeService = require('../../../src/services/email-activation-code-service')
const AppHelper = require('../../../src/helpers/app-helper')
const ErrorMessages = require('../../../src/helpers/error-messages')


describe('EmailActivationCode Service', () => {
  def('subject', () => EmailActivationCodeService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.generateActivationCode()', () => {
    const transaction = {}
    const error = 'Error!'

    const response = {
      activationCode: 'abcdefgwdwdwdwdwd',
      expirationTime: new Date().getTime() + ((60 * 60 * 24 * 3) * 1000),
    }

    def('subject', () => $subject.generateActivationCode(transaction))
    def('generateStringResponse', () => response.activationCode)
    def('findActivationCodeResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(AppHelper, 'generateRandomString').returns($generateStringResponse)
      $sandbox.stub(EmailActivationCodeManager, 'getByActivationCode').returns($findActivationCodeResponse)
    })

    it('calls AppHelper#generateRandomString() with correct args', async () => {
      await $subject
      expect(AppHelper.generateRandomString).to.have.been.calledWith(16)
    })

    context('when AppHelper#generateRandomString() fails', () => {
      def('generateStringResponse', () => error)

      it(`fails with ${error}`, () => {
        return expect($subject).to.eventually.have.property('activationCode')
      })
    })

    context('when AppHelper#generateRandomString() succeeds', () => {
      it('calls EmailActivationCodeManager#getByActivationCode() with correct args', async () => {
        await $subject
        expect(EmailActivationCodeManager.getByActivationCode).to.have.been.calledWith(response.activationCode,
            transaction)
      })

      context('when EmailActivationCodeManager#getByActivationCode() fails', () => {
        def('findActivationCodeResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when EmailActivationCodeManager#getByActivationCode() succeeds', () => {
        it('fulfills the promise', () => {
          return expect($subject).to.eventually.have.property('activationCode') &&
            expect($subject).to.eventually.have.property('expirationTime')
        })
      })
    })
  })

  describe('.saveActivationCode()', () => {
    const transaction = {}
    const error = 'Error!'

    const userId = 15

    const activationCodeData = {
      activationCode: 'abcdefgwdwdwdwdwd',
      expirationTime: new Date().getTime() + ((60 * 60 * 24 * 3) * 1000),
    }

    def('subject', () => $subject.saveActivationCode(userId, activationCodeData, transaction))
    def('createActivationCodeResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(EmailActivationCodeManager, 'createActivationCode').returns($createActivationCodeResponse)
    })

    it('calls EmailActivationCodeManager#createActivationCode() with correct args', async () => {
      await $subject
      expect(EmailActivationCodeManager.createActivationCode).to.have.been.calledWith(userId,
          activationCodeData.activationCode, activationCodeData.expirationTime, transaction)
    })

    context('when EmailActivationCodeManager#createActivationCode() fails', () => {
      def('createActivationCodeResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(ErrorMessages.UNABLE_TO_CREATE_ACTIVATION_CODE)
      })
    })

    context('when EmailActivationCodeManager#createActivationCode() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.deep.equal(undefined)
      })
    })
  })

  describe('.verifyActivationCode()', () => {
    const transaction = {}
    const error = 'Error!'

    const activationCode = 'abcdefgwdwdwdwdwd'

    def('subject', () => $subject.verifyActivationCode(activationCode, transaction))
    def('verifyActivationCodeResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(EmailActivationCodeManager, 'verifyActivationCode').returns($verifyActivationCodeResponse)
    })

    it('calls EmailActivationCodeManager#verifyActivationCode() with correct args', async () => {
      await $subject
      expect(EmailActivationCodeManager.verifyActivationCode).to.have.been.calledWith(activationCode, transaction)
    })

    context('when EmailActivationCodeManager#verifyActivationCode() fails', () => {
      def('verifyActivationCodeResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(ErrorMessages.UNABLE_TO_GET_ACTIVATION_CODE)
      })
    })

    context('when EmailActivationCodeManager#verifyActivationCode() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.deep.equal(undefined)
      })
    })
  })

  describe('.deleteActivationCode()', () => {
    const transaction = {}
    const error = 'Error!'

    const activationCode = 'abcdefgwdwdwdwdwd'

    def('subject', () => $subject.deleteActivationCode(activationCode, transaction))
    def('deleteActivationCodeResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(EmailActivationCodeManager, 'delete').returns($deleteActivationCodeResponse)
    })

    it('calls EmailActivationCodeManager#delete() with correct args', async () => {
      await $subject
      expect(EmailActivationCodeManager.delete).to.have.been.calledWith({
        activationCode: activationCode,
      }, transaction)
    })

    context('when EmailActivationCodeManager#delete() fails', () => {
      def('deleteActivationCodeResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when EmailActivationCodeManager#delete() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.deep.equal(undefined)
      })
    })
  })
})
