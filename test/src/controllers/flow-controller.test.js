const { expect } = require('chai')
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
      $sandbox.stub(FlowService, 'createFlowEndPoint').returns($response)
    })

    it('calls FlowService.createFlowEndPoint with correct args', async () => {
      await $subject
      expect(FlowService.createFlowEndPoint).to.have.been.calledWith({
        name: $name,
        description: $description,
        isActivated: $isActivated,
      }, $user, false)
    })

    context('when FlowService#createFlowEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowService#createFlowEndPoint succeeds', () => {
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
      $sandbox.stub(FlowService, 'getUserFlowsEndPoint').returns($response)
    })

    it('calls FlowService.getUserFlowsEndPoint with correct args', async () => {
      await $subject
      expect(FlowService.getUserFlowsEndPoint).to.have.been.calledWith($user, false)
    })

    context('when FlowService#getUserFlowsEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowService#getUserFlowsEndPoint succeeds', () => {
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
      $sandbox.stub(FlowService, 'getFlowEndPoint').returns($response)
    })

    it('calls FlowService.getFlowEndPoint with correct args', async () => {
      await $subject
      expect(FlowService.getFlowEndPoint).to.have.been.calledWith($id, $user, false)
    })

    context('when FlowService#getFlowEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowService#getFlowEndPoint succeeds', () => {
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
      $sandbox.stub(FlowService, 'updateFlowEndPoint').returns($response)
    })

    it('calls FlowService.updateFlowEndPoint with correct args', async () => {
      await $subject
      expect(FlowService.updateFlowEndPoint).to.have.been.calledWith({
        name: $name,
        description: $description,
        isActivated: $isActivated,
      }, $id, $user, false)
    })

    context('when FlowService#updateFlowEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowService#updateFlowEndPoint succeeds', () => {
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
      $sandbox.stub(FlowService, 'deleteFlowEndPoint').returns($response)
    })

    it('calls FlowService.deleteFlowEndPoint with correct args', async () => {
      await $subject
      expect(FlowService.deleteFlowEndPoint).to.have.been.calledWith($id, $user, false)
    })

    context('when FlowService.deleteFlowEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowService.deleteFlowEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
