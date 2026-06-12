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

  describe('.getArchitectures()', () => {
    const transaction = {}
    const error = 'Error!'

    def('subject', () => $subject.getArchitectures(isCLI, transaction))
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
        return expect($subject).to.eventually.have.property('architectures')
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
