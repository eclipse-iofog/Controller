const { expect } = require('chai')
const sinon = require('sinon')
const Op = require('sequelize').Op

const ChangeTrackingManager = require('../../../src/data/managers/change-tracking-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')

describe('ChangeTracking Service', () => {
  def('subject', () => ChangeTrackingService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.create()', () => {
    const transaction = {}
    const error = 'Error!'

    const ioFogUuid = 'testUuid'

    def('subject', () => $subject.create(ioFogUuid, transaction))
    def('createResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(ChangeTrackingManager, 'create').returns($createResponse)
    })

    it('calls ChangeTrackingManager#create() with correct args', async () => {
      await $subject
      expect(ChangeTrackingManager.create).to.have.been.calledWith({
        iofogUuid: ioFogUuid,
        lastUpdated: sinon.match.string,
      }, transaction)
    })

    context('when ChangeTrackingManager#create() fails', () => {
      def('createResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ChangeTrackingManager#create() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.update()', () => {
    const transaction = {}
    const error = 'Error!'

    const ioFogUuid = 'testUuid'
    const data = ChangeTrackingService.events.clean

    def('subject', () => $subject.update(ioFogUuid, data, transaction))
    def('updateResponse', () => Promise.resolve())



    beforeEach(() => {
      $sandbox.stub(ChangeTrackingManager, 'create').returns($updateResponse)
    })

    it('calls ChangeTrackingManager#create() with correct args', async () => {
      await $subject
      expect(ChangeTrackingManager.create).to.have.been.calledWith({
        ...data,
        iofogUuid: ioFogUuid,
        lastUpdated: sinon.match.string,
      }, transaction)
    })

    context('when ChangeTrackingManager#create() fails', () => {
      def('updateResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ChangeTrackingManager#create() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.updateIfChanged()', () => {
    const transaction = {}
    const error = 'Error!'

    const ioFogUuid = 'testUuid'

    const data = ChangeTrackingService.events.clean

    def('subject', () => $subject.updateIfChanged(ioFogUuid, data, transaction))
    def('updateResponse', () => Promise.resolve())


    beforeEach(() => {
      $sandbox.stub(ChangeTrackingManager, 'create').returns($updateResponse)
    })

    it('calls ChangeTrackingManager#create() with correct args', async () => {
      await $subject
      expect(ChangeTrackingManager.create).to.have.been.calledWith({
        ...data,
        iofogUuid: ioFogUuid,
        lastUpdated: sinon.match.string,
      }, transaction)
    })

    context('when ChangeTrackingManager#create() fails', () => {
      def('updateResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ChangeTrackingManager#create() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getByIoFogUuid()', () => {
    const transaction = {}
    const error = 'Error!'

    const ioFogUuid = 'testUuid'

    def('subject', () => $subject.getByIoFogUuid(ioFogUuid, transaction))
    def('updateResponse', () => Promise.resolve([]))

    beforeEach(() => {
      $sandbox.stub(ChangeTrackingManager, 'findAll').returns($updateResponse)
    })

    it('calls ChangeTrackingManager#findOne() with correct args', async () => {
      await $subject
      expect(ChangeTrackingManager.findAll).to.have.been.calledWith({
        iofogUuid: ioFogUuid,
      }, transaction)
    })

    context('when ChangeTrackingManager#findOne() fails', () => {
      def('updateResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ChangeTrackingManager#findOne() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.eql([])
      })
    })
  })

  describe('.resetIfNotUpdated()', () => {
    const transaction = {}
    const error = 'Error!'

    const ioFogUuid = 'testUuid'
    const lastUpdated = 'now'

    def('subject', () => $subject.resetIfNotUpdated(ioFogUuid, lastUpdated, transaction))
    def('updateResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(ChangeTrackingManager, 'delete').returns($updateResponse)
    })

    it('calls ChangeTrackingManager#delete() with correct args', async () => {
      await $subject
      expect(ChangeTrackingManager.delete).to.have.been.calledWith({
        iofogUuid: ioFogUuid,
        lastUpdated: { [Op.lte]: lastUpdated }
      }, transaction)
    })

    context('when ChangeTrackingManager#delete() fails', () => {
      def('updateResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ChangeTrackingManager#delete() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
