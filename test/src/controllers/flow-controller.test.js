const {expect} = require('chai')
const sinon = require('sinon')

const FlowController = require('../../../src/controllers/flow-controller')
const FlowService = require('../../../src/services/flow-service')

describe('Flow Controller', () => {
  def('subject', () => FlowController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.createFlowEndPoint()', () => {
    def('user', () => 'user!')

    def('name', () => 'testName')
    def('description', () => 'testDescription')
    def('isActivated', () => true)

    def('req', () => ({
      body: {
        name: $name,
        description: $description,
        isActivated: $isActivated,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.createFlowEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(FlowService, 'createFlow').returns($response)
    })

    it('calls FlowService.createFlow with correct args', async () => {
      await $subject
      expect(FlowService.createFlow).to.have.been.calledWith({
        name: $name,
        description: $description,
        isActivated: $isActivated,
      }, $user, false)
    })

    context('when FlowService#createFlow fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowService#createFlow succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getFlowsByUserEndPoint()', () => {
    def('user', () => 'user!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getFlowsByUserEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(FlowService, 'getUserFlows').returns($response)
    })

    it('calls FlowService.getUserFlows with correct args', async () => {
      await $subject
      expect(FlowService.getUserFlows).to.have.been.calledWith($user, false)
    })

    context('when FlowService#getUserFlows fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowService#getUserFlows succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getFlowEndPoint()', () => {
    def('user', () => 'user!')
    def('id', () => 15)

    def('req', () => ({
      params: {
        id: $id,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.getFlowEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(FlowService, 'getFlowWithTransaction').returns($response)
    })

    it('calls FlowService.getFlowWithTransaction with correct args', async () => {
      await $subject
      expect(FlowService.getFlowWithTransaction).to.have.been.calledWith($id, $user, false)
    })

    context('when FlowService#getFlowWithTransaction fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowService#getFlowWithTransaction succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.updateFlowEndPoint()', () => {
    def('user', () => 'user!')
    def('id', () => 15)

    def('name', () => 'updatedTestName')
    def('description', () => 'updatedTestDescription')
    def('isActivated', () => false)

    def('req', () => ({
      params: {
        id: $id,
      },
      body: {
        name: $name,
        description: $description,
        isActivated: $isActivated,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateFlowEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(FlowService, 'updateFlow').returns($response)
    })

    it('calls FlowService.updateFlow with correct args', async () => {
      await $subject
      expect(FlowService.updateFlow).to.have.been.calledWith({
        name: $name,
        description: $description,
        isActivated: $isActivated,
      }, $id, $user, false)
    })

    context('when FlowService#updateFlow fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowService#updateFlow succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.deleteFlowEndPoint()', () => {
    def('user', () => 'user!')
    def('id', () => 15)

    def('req', () => ({
      params: {
        id: $id,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.deleteFlowEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(FlowService, 'deleteFlow').returns($response)
    })

    it('calls FlowService.deleteFlow with correct args', async () => {
      await $subject
      expect(FlowService.deleteFlow).to.have.been.calledWith($id, $user, false)
    })

    context('when FlowService.deleteFlow fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowService.deleteFlow succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
