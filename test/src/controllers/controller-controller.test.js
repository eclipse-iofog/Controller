const { expect } = require('chai')
const sinon = require('sinon')

const Controller = require('../../../src/controllers/controller')
const ControllerService = require('../../../src/services/controller-service')

describe('Controller', () => {
  def('subject', () => Controller)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.statusControllerEndPoint()', () => {
    def('req', () => ({
      body: {},
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.statusControllerEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(ControllerService, 'statusController').returns($response)
    })

    it('calls ControllerService.statusController with correct args', async () => {
      await $subject
      expect(ControllerService.statusController).to.have.been.calledWith(false)
    })

    context('when ControllerService#statusController fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ControllerService#statusController succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.architecturesEndPoint()', () => {
    def('req', () => ({
      body: {},
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.architecturesEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(ControllerService, 'getArchitectures').returns($response)
    })

    it('calls ControllerService.getArchitectures with correct args', async () => {
      await $subject
      expect(ControllerService.getArchitectures).to.have.been.calledWith(false)
    })

    context('when ControllerService#getArchitectures fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ControllerService#getArchitectures succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
