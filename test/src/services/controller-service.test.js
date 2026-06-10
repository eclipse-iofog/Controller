const { expect } = require('chai')
const sinon = require('sinon')

const ControllerService = require('../../../src/services/controller-service')
const architectureManager = require('../../../src/data/managers/architecture-manager')
const Config = require('../../../src/config')

describe('Controller Service', () => {
  def('subject', () => ControllerService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  const isCLI = false

  describe('.getFogTypes()', () => {
    const transaction = {}
    const error = 'Error!'

    def('subject', () => $subject.getFogTypes(isCLI, transaction))
    def('findResponse', () => Promise.resolve([{
      id: 15,
      name: 'testName',
      image: 'testImage',
      description: 'testDescription',
    }]))

    beforeEach(() => {
      $sandbox.stub(architectureManager, 'findAll').returns($findResponse)
    })

    it('calls architectureManager#findAll() with correct args', async () => {
      await $subject
      expect(architectureManager.findAll).to.have.been.calledWith({}, transaction)
    })

    context('when architectureManager#findAll() fails', () => {
      def('findResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when architectureManager#findAll() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.have.property('fogTypes')
      })
    })
  })

  describe('.emailActivation()', () => {
    const error = 'Error!'

    def('subject', () => $subject.emailActivation(isCLI))
    def('getResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Config, 'get').returns($getResponse)
    })

    it('calls Config#get() with correct args', async () => {
      await $subject
      expect(Config.get).to.have.been.calledWith('Email:ActivationEnabled')
    })

    context('when Config#get() fails', () => {
      def('getResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Config#get() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.have.property('isEmailActivationEnabled')
      })
    })
  })


  /*
  describe('.statusController()', () => {
    const error = 'Error!'

    def('subject', () => $subject.statusController(isCLI))
    def('getResponse', () => Promise.resolve())

    beforeEach(() => {
      // TODO daemon.status
      // $sandbox.stub(daemon, 'status').returns($getResponse);
    })

    // it('Returns valid status', () => {
    //   return expect($subject).to.have.property('status') &&
    //     expect($subject).to.have.property('timestamp')
    // })
  })
  */
})
