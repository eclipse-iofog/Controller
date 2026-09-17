'use strict'

const { expect } = require('chai')
const sinon = require('sinon')

const RuntimeClassManager = require('../../../src/data/managers/runtime-class-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const RuntimeClassService = require('../../../src/services/runtime-class-service')
const logger = require('../../../src/logger')
const Errors = require('../../../src/helpers/errors')

describe('RuntimeClass Service', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}
  const fogUuid = 'fog-1'

  afterEach(() => {
    $sandbox.restore()
  })

  function stubRuntimeClassRow (overrides = {}) {
    return {
      name: 'spin',
      handler: 'spin',
      getFogs: $sandbox.stub().resolves([]),
      addFog: $sandbox.stub().resolves(),
      removeFog: $sandbox.stub().resolves(),
      hasFog: $sandbox.stub().resolves(false),
      ...overrides
    }
  }

  describe('.createRuntimeClassEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(RuntimeClassManager, 'findOne').resolves(null)
      $sandbox.stub(RuntimeClassManager, 'create').callsFake(async (data) => data)
    })

    it('creates a runtime class by name', async () => {
      const result = await RuntimeClassService.createRuntimeClassEndpoint({
        name: 'spin',
        handler: 'spin'
      }, transaction)

      expect(result).to.eql({ name: 'spin', handler: 'spin' })
      expect(RuntimeClassManager.create).to.have.been.calledOnce
    })

    it('rejects a duplicate name', async () => {
      RuntimeClassManager.findOne.resolves(stubRuntimeClassRow())

      await expect(RuntimeClassService.createRuntimeClassEndpoint({
        name: 'spin',
        handler: 'spin'
      }, transaction)).to.be.rejectedWith(Errors.ConflictError, /already exists/)
    })
  })

  describe('.listRuntimeClassesEndpoint() and .getRuntimeClassEndpoint()', () => {
    const row = { name: 'spin', handler: 'spin' }

    beforeEach(() => {
      $sandbox.stub(RuntimeClassManager, 'findAll').resolves([row])
      $sandbox.stub(RuntimeClassManager, 'findOne').resolves(row)
    })

    it('lists all runtime classes', async () => {
      const result = await RuntimeClassService.listRuntimeClassesEndpoint(transaction)
      expect(result).to.eql({ runtimeClasses: [row] })
    })

    it('returns spec only without linked fogs', async () => {
      const result = await RuntimeClassService.getRuntimeClassEndpoint('spin', transaction)
      expect(result).to.eql(row)
      expect(result).to.not.have.property('fogUuids')
      expect(result).to.not.have.property('fogs')
    })

    it('throws when the runtime class is missing', async () => {
      RuntimeClassManager.findOne.resolves(null)
      await expect(RuntimeClassService.getRuntimeClassEndpoint('missing', transaction))
        .to.be.rejectedWith(Errors.NotFoundError, /missing/)
    })
  })

  describe('.updateRuntimeClassEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(RuntimeClassManager, 'findOne').resolves(stubRuntimeClassRow())
      $sandbox.stub(RuntimeClassManager, 'update').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('updates handler and notifies linked agents', async () => {
      RuntimeClassManager.findOne.resolves(stubRuntimeClassRow({
        getFogs: $sandbox.stub().resolves([{ uuid: fogUuid }])
      }))

      await RuntimeClassService.updateRuntimeClassEndpoint('spin', {
        handler: 'wasmtime'
      }, transaction)

      expect(RuntimeClassManager.update).to.have.been.calledWith(
        { name: 'spin' },
        sinon.match({ handler: 'wasmtime' }),
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        fogUuid,
        ChangeTrackingService.events.runtimeClasses,
        transaction
      )
    })
  })

  describe('.deleteRuntimeClassEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(RuntimeClassManager, 'findOne').resolves(stubRuntimeClassRow())
      $sandbox.stub(RuntimeClassManager, 'delete').resolves()
      $sandbox.stub(MicroserviceManager, 'findAll').resolves([])
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('deletes when no microservice pins the runtime name', async () => {
      const result = await RuntimeClassService.deleteRuntimeClassEndpoint('spin', transaction)
      expect(result).to.eql({})
      expect(RuntimeClassManager.delete).to.have.been.calledWith({ name: 'spin' }, transaction)
    })

    it('refuses delete when any microservice pins the runtime name', async () => {
      MicroserviceManager.findAll.resolves([
        { uuid: 'ms-1', runtime: 'spin' }
      ])

      await expect(RuntimeClassService.deleteRuntimeClassEndpoint('spin', transaction))
        .to.be.rejectedWith(Errors.ConflictError, /ms-1/)
      expect(RuntimeClassManager.delete).to.not.have.been.called
    })
  })

  describe('link and unlink', () => {
    let runtimeClass
    let agent

    beforeEach(() => {
      runtimeClass = stubRuntimeClassRow()
      agent = {
        uuid: fogUuid,
        containerEngine: 'edgelet'
      }
      $sandbox.stub(RuntimeClassManager, 'findOne').resolves(runtimeClass)
      $sandbox.stub(FogManager, 'findOne').resolves(agent)
      $sandbox.stub(MicroserviceManager, 'findAll').resolves([])
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
      $sandbox.stub(logger, 'warn')
    })

    it('links an edgelet fog and sets the runtimeClasses change flag', async () => {
      const result = await RuntimeClassService.linkRuntimeClassEndpoint('spin', [fogUuid], transaction)
      expect(runtimeClass.addFog).to.have.been.calledWith(agent, { transaction })
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        fogUuid,
        ChangeTrackingService.events.runtimeClasses,
        transaction
      )
      expect(result.name).to.equal('spin')
    })

    it('refuses link when the fog is not using edgelet', async () => {
      agent.containerEngine = 'docker'
      await expect(RuntimeClassService.linkRuntimeClassEndpoint('spin', [fogUuid], transaction))
        .to.be.rejectedWith(Errors.ValidationError, /edgelet/)
      expect(runtimeClass.addFog).to.not.have.been.called
    })

    it('warns when the handler is not in the known catalog', async () => {
      runtimeClass.handler = 'custom-oci'
      await RuntimeClassService.linkRuntimeClassEndpoint('spin', [fogUuid], transaction)
      expect(logger.warn).to.have.been.calledOnce
    })

    it('does not set the change flag when the fog is already linked', async () => {
      runtimeClass.getFogs.resolves([{ uuid: fogUuid }])
      await RuntimeClassService.linkRuntimeClassEndpoint('spin', [fogUuid], transaction)
      expect(ChangeTrackingService.update).to.not.have.been.called
    })

    it('returns linked fog uuids', async () => {
      runtimeClass.getFogs.resolves([{ uuid: fogUuid }])
      const result = await RuntimeClassService.getRuntimeClassLinkEndpoint('spin', transaction)
      expect(result).to.eql({ fogUuids: [fogUuid] })
    })

    it('unlinks a fog and sets the runtimeClasses change flag', async () => {
      await RuntimeClassService.unlinkRuntimeClassEndpoint('spin', [fogUuid], transaction)
      expect(runtimeClass.removeFog).to.have.been.calledWith(agent, { transaction })
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        fogUuid,
        ChangeTrackingService.events.runtimeClasses,
        transaction
      )
    })

    it('refuses unlink when a microservice on that fog pins the runtime name', async () => {
      MicroserviceManager.findAll.resolves([
        { uuid: 'ms-bound', iofogUuid: fogUuid, runtime: 'spin' }
      ])

      await expect(RuntimeClassService.unlinkRuntimeClassEndpoint('spin', [fogUuid], transaction))
        .to.be.rejectedWith(Errors.ConflictError, /ms-bound/)
      expect(runtimeClass.removeFog).to.not.have.been.called
    })
  })

  describe('.upsertRuntimeClassEndpoint()', () => {
    it('creates when the name is new and updates when it already exists', async () => {
      $sandbox.stub(RuntimeClassManager, 'findOne').resolves(null)
      $sandbox.stub(RuntimeClassManager, 'create').callsFake(async (data) => data)

      const created = await RuntimeClassService.upsertRuntimeClassEndpoint('spin', {
        handler: 'spin'
      }, transaction)
      expect(created.name).to.equal('spin')
      expect(RuntimeClassManager.create).to.have.been.calledOnce

      const existing = stubRuntimeClassRow({
        getFogs: $sandbox.stub().resolves([])
      })
      RuntimeClassManager.findOne.resolves(existing)
      $sandbox.stub(RuntimeClassManager, 'update').resolves()

      await RuntimeClassService.upsertRuntimeClassEndpoint('spin', {
        handler: 'wasmtime'
      }, transaction)
      expect(RuntimeClassManager.update).to.have.been.calledOnce
      expect(RuntimeClassManager.create).to.have.been.calledOnce
    })
  })

  describe('.ensureRuntimeClassLinkedToFog()', () => {
    let runtimeClass
    let agent

    beforeEach(() => {
      runtimeClass = stubRuntimeClassRow()
      agent = {
        uuid: fogUuid,
        containerEngine: 'edgelet'
      }
      $sandbox.stub(FogManager, 'findOne').resolves(agent)
      $sandbox.stub(RuntimeClassManager, 'findOne').resolves(runtimeClass)
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('links a missing class on an edgelet fog and is idempotent when already linked', async () => {
      const first = await RuntimeClassService.ensureRuntimeClassLinkedToFog(fogUuid, 'spin', transaction)
      expect(first).to.equal(true)
      expect(runtimeClass.addFog).to.have.been.calledOnce
      expect(ChangeTrackingService.update).to.have.been.calledOnce

      runtimeClass.hasFog.resolves(true)
      ChangeTrackingService.update.resetHistory()
      runtimeClass.addFog.resetHistory()

      const second = await RuntimeClassService.ensureRuntimeClassLinkedToFog(fogUuid, 'spin', transaction)
      expect(second).to.equal(false)
      expect(runtimeClass.addFog).to.not.have.been.called
      expect(ChangeTrackingService.update).to.not.have.been.called
    })

    it('does not link when the fog is not using edgelet', async () => {
      agent.containerEngine = 'docker'
      const linked = await RuntimeClassService.ensureRuntimeClassLinkedToFog(fogUuid, 'spin', transaction)
      expect(linked).to.equal(false)
      expect(runtimeClass.addFog).to.not.have.been.called
    })

    it('rejects when the runtime class row is missing', async () => {
      RuntimeClassManager.findOne.resolves(null)
      await expect(RuntimeClassService.ensureRuntimeClassLinkedToFog(fogUuid, 'spin', transaction))
        .to.be.rejectedWith(Errors.ValidationError, /does not exist/)
    })
  })
})
