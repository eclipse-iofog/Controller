'use strict'

const { expect } = require('chai')
const sinon = require('sinon')

const FleetModelManager = require('../../../src/data/managers/fleet-model-manager')
const RegistryManager = require('../../../src/data/managers/registry-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const MicroserviceModelItemManager = require('../../../src/data/managers/microservice-model-item-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const ModelService = require('../../../src/services/model-service')
const AppHelper = require('../../../src/helpers/app-helper')
const Errors = require('../../../src/helpers/errors')

describe('Model Service', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}
  const modelUuid = '3f2c8a1e-2b64-4c0d-9f11-0a1b2c3d4e5f'
  const fogUuid = 'fog-1'

  afterEach(() => {
    $sandbox.restore()
  })

  function stubModelRow (overrides = {}) {
    const row = {
      uuid: modelUuid,
      name: 'test-model',
      repo: 'org/repo',
      revision: '',
      registryId: 3,
      files: ['file.gguf'],
      format: 'gguf',
      getFogs: $sandbox.stub().resolves([]),
      ...overrides
    }
    return row
  }

  describe('.createModelEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(AppHelper, 'generateUUID').returns(modelUuid)
      $sandbox.stub(FleetModelManager, 'findOne').resolves(null)
      $sandbox.stub(FleetModelManager, 'create').callsFake(async (data) => data)
      $sandbox.stub(RegistryManager, 'findOne').resolves({ id: 3, type: 'hf' })
    })

    it('creates a model with a server-generated uuid', async () => {
      const result = await ModelService.createModelEndpoint({
        name: 'test-model',
        repo: 'org/repo',
        registryId: 3,
        files: ['file.gguf'],
        format: 'gguf'
      }, transaction)

      expect(result).to.eql({
        uuid: modelUuid,
        name: 'test-model',
        repo: 'org/repo',
        revision: '',
        registryId: 3,
        files: ['file.gguf'],
        format: 'gguf'
      })
      expect(FleetModelManager.create).to.have.been.calledOnce
    })

    it('rejects a duplicate name', async () => {
      FleetModelManager.findOne.resolves(stubModelRow())

      await expect(ModelService.createModelEndpoint({
        name: 'test-model',
        repo: 'org/repo',
        registryId: 3,
        files: ['file.gguf']
      }, transaction)).to.be.rejectedWith(Errors.ConflictError, /already exists/)
    })

    it('requires files for a Hugging Face registry', async () => {
      await expect(ModelService.createModelEndpoint({
        name: 'test-model',
        repo: 'org/repo',
        registryId: 3
      }, transaction)).to.be.rejectedWith(Errors.ValidationError, /non-empty files list/)
    })

    it('rejects files for an OCI registry', async () => {
      RegistryManager.findOne.resolves({ id: 1, type: 'oci' })

      await expect(ModelService.createModelEndpoint({
        name: 'oci-model',
        repo: 'org/repo',
        registryId: 1,
        files: ['weights.bin']
      }, transaction)).to.be.rejectedWith(Errors.ValidationError, /must not specify files/)
    })
  })

  describe('.listModelsEndpoint() and .getModelEndpoint()', () => {
    const row = {
      uuid: modelUuid,
      name: 'test-model',
      repo: 'org/repo',
      revision: 'abc',
      registryId: 3,
      files: ['file.gguf'],
      format: 'gguf'
    }

    beforeEach(() => {
      $sandbox.stub(FleetModelManager, 'findAll').resolves([row])
      $sandbox.stub(FleetModelManager, 'findOne').resolves(row)
    })

    it('lists all fleet models', async () => {
      const result = await ModelService.listModelsEndpoint(transaction)
      expect(result).to.eql({ models: [row] })
    })

    it('returns spec only without linked fogs', async () => {
      const result = await ModelService.getModelEndpoint('test-model', transaction)
      expect(result).to.eql(row)
      expect(result).to.not.have.property('fogUuids')
      expect(result).to.not.have.property('fogs')
    })

    it('throws when the model is missing', async () => {
      FleetModelManager.findOne.resolves(null)
      await expect(ModelService.getModelEndpoint('missing', transaction))
        .to.be.rejectedWith(Errors.NotFoundError, /missing/)
    })
  })

  describe('.updateModelEndpoint()', () => {
    beforeEach(() => {
      const row = stubModelRow()
      $sandbox.stub(FleetModelManager, 'findOne').resolves(row)
      $sandbox.stub(FleetModelManager, 'update').resolves()
      $sandbox.stub(RegistryManager, 'findOne').resolves({ id: 3, type: 'hf' })
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('updates spec fields and notifies linked agents', async () => {
      FleetModelManager.findOne.resolves(stubModelRow({
        getFogs: $sandbox.stub().resolves([{ uuid: fogUuid }])
      }))

      await ModelService.updateModelEndpoint('test-model', {
        revision: 'main',
        files: ['other.gguf']
      }, transaction)

      expect(FleetModelManager.update).to.have.been.calledWith(
        { name: 'test-model' },
        sinon.match({
          repo: 'org/repo',
          revision: 'main',
          registryId: 3,
          files: ['other.gguf'],
          format: 'gguf'
        }),
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        fogUuid,
        ChangeTrackingService.events.models,
        transaction
      )
    })
  })

  describe('.deleteModelEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(FleetModelManager, 'findOne').resolves(stubModelRow())
      $sandbox.stub(FleetModelManager, 'delete').resolves()
      $sandbox.stub(MicroserviceModelItemManager, 'findAll').resolves([])
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('deletes when no microservice binds the name', async () => {
      const result = await ModelService.deleteModelEndpoint('test-model', transaction)
      expect(result).to.eql({})
      expect(FleetModelManager.delete).to.have.been.calledWith({ name: 'test-model' }, transaction)
    })

    it('refuses delete when any microservice binds the name', async () => {
      MicroserviceModelItemManager.findAll.resolves([
        { microserviceUuid: 'ms-1', name: 'test-model' }
      ])

      await expect(ModelService.deleteModelEndpoint('test-model', transaction))
        .to.be.rejectedWith(Errors.ConflictError, /ms-1/)
      expect(FleetModelManager.delete).to.not.have.been.called
    })
  })

  describe('link and unlink', () => {
    let model
    let agent

    beforeEach(() => {
      model = stubModelRow()
      agent = {
        uuid: fogUuid,
        addModel: $sandbox.stub().resolves(),
        removeModel: $sandbox.stub().resolves()
      }
      $sandbox.stub(FleetModelManager, 'findOne').resolves(model)
      $sandbox.stub(FogManager, 'findOne').resolves(agent)
      $sandbox.stub(MicroserviceManager, 'findAll').resolves([])
      $sandbox.stub(MicroserviceModelItemManager, 'findAll').resolves([])
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('links a fog and sets the models change flag', async () => {
      const result = await ModelService.linkModelEndpoint('test-model', [fogUuid], transaction)
      expect(agent.addModel).to.have.been.calledWith(model, { transaction })
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        fogUuid,
        ChangeTrackingService.events.models,
        transaction
      )
      expect(result.name).to.equal('test-model')
    })

    it('does not set the change flag when the fog is already linked', async () => {
      model.getFogs.resolves([{ uuid: fogUuid }])
      await ModelService.linkModelEndpoint('test-model', [fogUuid], transaction)
      expect(ChangeTrackingService.update).to.not.have.been.called
    })

    it('returns linked fog uuids', async () => {
      model.getFogs.resolves([{ uuid: fogUuid }])
      const result = await ModelService.getModelLinkEndpoint('test-model', transaction)
      expect(result).to.eql({ fogUuids: [fogUuid] })
    })

    it('unlinks a fog and sets the models change flag', async () => {
      await ModelService.unlinkModelEndpoint('test-model', [fogUuid], transaction)
      expect(agent.removeModel).to.have.been.calledWith(model, { transaction })
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        fogUuid,
        ChangeTrackingService.events.models,
        transaction
      )
    })

    it('refuses unlink when a microservice on that fog binds the name', async () => {
      MicroserviceModelItemManager.findAll.resolves([
        { microserviceUuid: 'ms-bound', name: 'test-model' }
      ])
      $sandbox.stub(MicroserviceManager, 'findOne').resolves({
        uuid: 'ms-bound',
        iofogUuid: fogUuid
      })

      await expect(ModelService.unlinkModelEndpoint('test-model', [fogUuid], transaction))
        .to.be.rejectedWith(Errors.ConflictError, /ms-bound/)
      expect(agent.removeModel).to.not.have.been.called
    })
  })

  describe('.upsertModelEndpoint()', () => {
    it('creates when the name is new and updates when it already exists', async () => {
      $sandbox.stub(AppHelper, 'generateUUID').returns(modelUuid)
      $sandbox.stub(FleetModelManager, 'findOne').resolves(null)
      $sandbox.stub(FleetModelManager, 'create').callsFake(async (data) => data)
      $sandbox.stub(RegistryManager, 'findOne').resolves({ id: 3, type: 'hf' })

      const created = await ModelService.upsertModelEndpoint('test-model', {
        repo: 'org/repo',
        registryId: 3,
        files: ['file.gguf']
      }, transaction)
      expect(created.uuid).to.equal(modelUuid)
      expect(FleetModelManager.create).to.have.been.calledOnce

      const existing = stubModelRow({
        getFogs: $sandbox.stub().resolves([])
      })
      FleetModelManager.findOne.resolves(existing)
      $sandbox.stub(FleetModelManager, 'update').resolves()

      await ModelService.upsertModelEndpoint('test-model', {
        repo: 'org/other',
        files: ['file.gguf']
      }, transaction)
      expect(FleetModelManager.update).to.have.been.calledOnce
      expect(FleetModelManager.create).to.have.been.calledOnce
    })
  })

  describe('.ensureModelsLinkedToFog()', () => {
    let model
    let agent

    beforeEach(() => {
      model = stubModelRow()
      agent = {
        uuid: fogUuid,
        hasModel: $sandbox.stub().resolves(false),
        addModel: $sandbox.stub().resolves()
      }
      $sandbox.stub(FogManager, 'findOne').resolves(agent)
      $sandbox.stub(FleetModelManager, 'findOne').resolves(model)
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('links missing models and is idempotent when already linked', async () => {
      const first = await ModelService.ensureModelsLinkedToFog(fogUuid, ['test-model'], transaction)
      expect(first).to.eql(['test-model'])
      expect(agent.addModel).to.have.been.calledOnce
      expect(ChangeTrackingService.update).to.have.been.calledOnce

      agent.hasModel.resolves(true)
      ChangeTrackingService.update.resetHistory()
      agent.addModel.resetHistory()

      const second = await ModelService.ensureModelsLinkedToFog(fogUuid, ['test-model'], transaction)
      expect(second).to.eql([])
      expect(agent.addModel).to.not.have.been.called
      expect(ChangeTrackingService.update).to.not.have.been.called
    })
  })
})
