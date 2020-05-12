const { expect } = require('chai')
const sinon = require('sinon')

const ApplicationController = require('../../../src/controllers/application-controller')
const ApplicationService = require('../../../src/services/application-service')

describe('Application Controller', () => {
  def('subject', () => ApplicationController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.createApplicationEndPoint()', () => {
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
    def('subject', () => $subject.createApplicationEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ApplicationService, 'createApplicationEndPoint').returns($response)
    })

    it('calls ApplicationService.createApplicationEndPoint with correct args', async () => {
      await $subject
      expect(ApplicationService.createApplicationEndPoint).to.have.been.calledWith({
        name: $name,
        description: $description,
        isActivated: $isActivated,
      }, $user, false)
    })

    context('when ApplicationService#createApplicationEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ApplicationService#createApplicationEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getApplicationsByUserEndPoint()', () => {
    def('user', () => 'user!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getApplicationsByUserEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ApplicationService, 'getUserApplicationsEndPoint').returns($response)
    })

    it('calls ApplicationService.getUserApplicationsEndPoint with correct args', async () => {
      await $subject
      expect(ApplicationService.getUserApplicationsEndPoint).to.have.been.calledWith($user, false)
    })

    context('when ApplicationService#getUserApplicationsEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ApplicationService#getUserApplicationsEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getApplicationEndPoint()', () => {
    def('user', () => 'user!')
    def('name', () => 'my-application')

    def('req', () => ({
      params: {
        name: $name,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.getApplicationEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ApplicationService, 'getApplicationEndPoint').returns($response)
    })

    it('calls ApplicationService.getApplicationEndPoint with correct args', async () => {
      await $subject
      expect(ApplicationService.getApplicationEndPoint).to.have.been.calledWith($name, $user, false)
    })

    context('when ApplicationService#getApplicationEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ApplicationService#getApplicationEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.updateApplicationEndPoint()', () => {
    def('user', () => 'user!')
    def('oldName', () => 'my-app')

    def('name', () => 'updated-test-name')
    def('description', () => 'updatedTestDescription')
    def('isActivated', () => false)

    def('req', () => ({
      params: {
        name: $oldName,
      },
      body: {
        name: $name,
        description: $description,
        isActivated: $isActivated,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateApplicationEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ApplicationService, 'updateApplicationEndPoint').returns($response)
    })

    it('calls ApplicationService.updateApplicationEndPoint with correct args', async () => {
      await $subject
      expect(ApplicationService.updateApplicationEndPoint).to.have.been.calledWith({
        name: $name,
        description: $description,
        isActivated: $isActivated,
      }, $oldName, $user, false)
    })

    context('when ApplicationService#updateApplicationEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ApplicationService#updateApplicationEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.deleteApplicationEndPoint()', () => {
    def('user', () => 'user!')
    def('name', () => 'my-app')

    def('req', () => ({
      params: {
        name: $name,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.deleteApplicationEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ApplicationService, 'deleteApplicationEndPoint').returns($response)
    })

    it('calls ApplicationService.deleteApplicationEndPoint with correct args', async () => {
      await $subject
      expect(ApplicationService.deleteApplicationEndPoint).to.have.been.calledWith($name, $user, false)
    })

    context('when ApplicationService.deleteApplicationEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ApplicationService.deleteApplicationEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
