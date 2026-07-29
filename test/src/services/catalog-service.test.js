const { expect } = require('chai')
const sinon = require('sinon')

const CatalogItemManager = require('../../../src/data/managers/catalog-item-manager')
const CatalogService = require('../../../src/services/catalog-service')
const Validator = require('../../../src/schemas')
const CatalogItemImageManager = require('../../../src/data/managers/catalog-item-image-manager')
const CatalogItemInputTypeManager = require('../../../src/data/managers/catalog-item-input-type-manager')
const CatalogItemOutputTypeManager = require('../../../src/data/managers/catalog-item-output-type-manager')
const RegistryManager = require('../../../src/data/managers/registry-manager')
const AppHelper = require('../../../src/helpers/app-helper')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const ReconcileOutboxManager = require('../../../src/data/managers/reconcile-outbox-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const DBConstants = require('../../../src/data/constants')
const ErrorMessages = require('../../../src/helpers/error-messages')
const Errors = require('../../../src/helpers/errors')

const transaction = {}
const isCLI = true

function buildCatalogItem (fields = {}) {
  return {
    id: 15,
    name: 'test-catalog',
    description: 'desc',
    category: 'USER',
    publisher: 'Acme',
    registryId: 1,
    isPublic: true,
    ...fields
  }
}

function buildCreatePayload (fields = {}) {
  return {
    name: 'test-catalog',
    description: 'desc',
    category: 'USER',
    publisher: 'Acme',
    registryId: 1,
    isPublic: true,
    images: [{ containerImage: 'demo:latest', archId: 1 }],
    inputType: { infoType: 'json', infoFormat: 'object' },
    outputType: { infoType: 'json', infoFormat: 'object' },
    ...fields
  }
}

function stubCreateCatalogDeps (sandbox, { itemId = 15 } = {}) {
  const created = buildCatalogItem({ id: itemId })

  sandbox.stub(Validator, 'validate').resolves(true)
  sandbox.stub(CatalogItemManager, 'findOne').resolves(null)
  sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
  sandbox.stub(RegistryManager, 'findOne').resolves({ id: 1 })
  sandbox.stub(CatalogItemManager, 'create').resolves(created)
  sandbox.stub(CatalogItemImageManager, 'bulkCreate').resolves()
  sandbox.stub(CatalogItemInputTypeManager, 'create').resolves()
  sandbox.stub(CatalogItemOutputTypeManager, 'create').resolves()
}

describe('Catalog Service', () => {
  def('service', () => CatalogService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.createCatalogItemEndPoint()', () => {
    const data = buildCreatePayload()

    def('subject', () => $service.createCatalogItemEndPoint(data, transaction))

    beforeEach(() => {
      stubCreateCatalogDeps($sandbox)
    })

    it('validates input and creates catalog item with dependencies', async () => {
      const result = await $subject
      expect(Validator.validate).to.have.been.calledWith(data, Validator.schemas.catalogItemCreate)
      expect(CatalogItemManager.create).to.have.been.calledOnce
      expect(CatalogItemImageManager.bulkCreate).to.have.been.calledOnce
      expect(CatalogItemInputTypeManager.create).to.have.been.calledOnce
      expect(CatalogItemOutputTypeManager.create).to.have.been.calledOnce
      expect(result).to.eql({ id: 15 })
    })

    it('rejects restricted publisher names', () => {
      const badPayload = buildCreatePayload({ publisher: 'Eclipse ioFog' })
      return expect($service.createCatalogItemEndPoint(badPayload, transaction))
        .to.be.rejectedWith(ErrorMessages.RESTRICTED_PUBLISHER)
    })

    context('when name already exists', () => {
      beforeEach(() => {
        CatalogItemManager.findOne.resolves(buildCatalogItem())
      })

      it('rejects with DuplicatePropertyError', () => expect($subject).to.be.rejectedWith(Errors.DuplicatePropertyError))
    })

    context('when registry is missing', () => {
      beforeEach(() => {
        RegistryManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })

  describe('.listCatalogItemsEndPoint()', () => {
    const items = [buildCatalogItem()]

    def('subject', () => $service.listCatalogItemsEndPoint(isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(CatalogItemManager, 'findAllWithDependencies').resolves(items)
    })

    it('returns catalog items', async () => {
      const result = await $subject
      expect(CatalogItemManager.findAllWithDependencies).to.have.been.calledWith({}, {}, transaction)
      expect(result.catalogItems).to.equal(items)
    })
  })

  describe('.getCatalogItemEndPoint()', () => {
    const item = buildCatalogItem()

    def('subject', () => $service.getCatalogItemEndPoint(item.id, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(CatalogItemManager, 'findOneWithDependencies').resolves(item)
    })

    it('returns a catalog item by id', async () => {
      const result = await $subject
      expect(CatalogItemManager.findOneWithDependencies).to.have.been.calledWith({ id: item.id }, {}, transaction)
      expect(result).to.equal(item)
    })

    context('when item is missing', () => {
      beforeEach(() => {
        CatalogItemManager.findOneWithDependencies.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })

  describe('.deleteCatalogItemEndPoint()', () => {
    const itemId = 15
    const item = buildCatalogItem({ id: itemId })

    def('subject', () => $service.deleteCatalogItemEndPoint(itemId, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(CatalogItemManager, 'findOne').resolves(item)
      $sandbox.stub(MicroserviceManager, 'findAllWithStatuses').resolves([])
      $sandbox.stub(CatalogItemManager, 'delete').resolves(1)
    })

    it('deletes an unused catalog item', async () => {
      const result = await $subject
      expect(CatalogItemManager.delete).to.have.been.calledWith({ id: itemId }, transaction)
      expect(result).to.equal(1)
    })

    context('when item is system catalog', () => {
      beforeEach(() => {
        CatalogItemManager.findOne.resolves({ ...item, category: 'SYSTEM' })
      })

      it('rejects with ValidationError', () => expect($subject).to.be.rejectedWith(Errors.ValidationError))
    })

    context('when item is in use', () => {
      beforeEach(() => {
        MicroserviceManager.findAllWithStatuses.resolves([{ uuid: 'msvc-uuid' }])
      })

      it('rejects with ValidationError', () => expect($subject).to.be.rejectedWith(ErrorMessages.CATALOG_ITEM_IMAGES_IS_FROZEN))
    })
  })

  describe('.updateCatalogItemEndPoint()', () => {
    const itemId = 15
    const existing = buildCatalogItem({ id: itemId })
    const updateData = { description: 'updated description' }

    def('subject', () => $service.updateCatalogItemEndPoint(itemId, updateData, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
      $sandbox.stub(AppHelper, 'isEmpty').returns(false)
      $sandbox.stub(CatalogItemManager, 'findOne').resolves(existing)
      $sandbox.stub(CatalogItemManager, 'update').resolves()
    })

    it('updates catalog item metadata', async () => {
      await $subject
      expect(CatalogItemManager.update).to.have.been.calledWith({ id: itemId }, sinon.match.object, transaction)
    })

    context('when item is system catalog', () => {
      beforeEach(() => {
        CatalogItemManager.findOne.resolves({ ...existing, category: 'SYSTEM' })
      })

      it('rejects with ValidationError', () => expect($subject).to.be.rejectedWith(Errors.ValidationError))
    })

    context('when images are updated', () => {
      const dataWithImages = {
        description: 'updated',
        images: [{ containerImage: 'demo:v2', archId: 1 }]
      }

      def('subject', () => $service.updateCatalogItemEndPoint(itemId, dataWithImages, isCLI, transaction))

      beforeEach(() => {
        $sandbox.stub(CatalogItemImageManager, 'updateOrCreate').resolves()
        $sandbox.stub(ReconcileOutboxManager, 'enqueueAgentPropagation').resolves()
        $sandbox.stub(MicroserviceManager, 'updateAndFind').resolves()
        $sandbox.stub(MicroserviceManager, 'update').resolves()
        $sandbox.stub(ChangeTrackingService, 'update').resolves()
      })

      it('enqueues background agent propagation without sync fan-out', async () => {
        await $subject
        expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledOnceWith({
          scope: 'catalog',
          reason: 'images_updated',
          catalogItemId: itemId,
          actions: ['rebuild', 'notify_microservices']
        }, transaction)
        expect(MicroserviceManager.updateAndFind).to.not.have.been.called
        expect(MicroserviceManager.update).to.not.have.been.called
        expect(ChangeTrackingService.update).to.not.have.been.called
      })

      it('completes quickly when many microservices use the catalog item (no sync fan-out)', async () => {
        const startedAt = Date.now()
        await $subject
        const elapsedMs = Date.now() - startedAt

        expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledOnce
        expect(MicroserviceManager.update).to.not.have.been.called
        expect(MicroserviceManager.updateAndFind).to.not.have.been.called
        expect(ChangeTrackingService.update).to.not.have.been.called
        expect(elapsedMs).to.be.below(2000)
      })
    })

    context('when registryId is unchanged', () => {
      const dataWithSameRegistry = { description: 'updated', registryId: existing.registryId }

      def('subject', () => $service.updateCatalogItemEndPoint(itemId, dataWithSameRegistry, isCLI, transaction))

      beforeEach(() => {
        $sandbox.stub(ReconcileOutboxManager, 'enqueueAgentPropagation').resolves()
        $sandbox.stub(MicroserviceManager, 'findAllWithStatuses').resolves([{ uuid: 'msvc-uuid' }])
        $sandbox.stub(MicroserviceManager, 'updateAndFind').resolves()
      })

      it('does not enqueue agent propagation', async () => {
        await $subject
        expect(ReconcileOutboxManager.enqueueAgentPropagation).to.not.have.been.called
        expect(MicroserviceManager.findAllWithStatuses).to.not.have.been.called
        expect(MicroserviceManager.updateAndFind).to.not.have.been.called
      })
    })

    context('when registryId is null or omitted', () => {
      beforeEach(() => {
        $sandbox.stub(ReconcileOutboxManager, 'enqueueAgentPropagation').resolves()
        $sandbox.stub(RegistryManager, 'findOne').resolves({ id: 1 })
      })

      it('preserves existing registryId when null is sent', async () => {
        await $service.updateCatalogItemEndPoint(itemId, { description: 'updated', registryId: null }, isCLI, transaction)
        expect(ReconcileOutboxManager.enqueueAgentPropagation).to.not.have.been.called
        const updatePayload = CatalogItemManager.update.getCall(0).args[1]
        expect(updatePayload).to.include({ description: 'updated' })
        expect(updatePayload).to.not.have.property('registryId')
      })

      it('preserves existing registryId when omitted', async () => {
        await $service.updateCatalogItemEndPoint(itemId, { description: 'updated' }, isCLI, transaction)
        expect(ReconcileOutboxManager.enqueueAgentPropagation).to.not.have.been.called
        const updatePayload = CatalogItemManager.update.getCall(0).args[1]
        expect(updatePayload).to.include({ description: 'updated' })
        expect(updatePayload).to.not.have.property('registryId')
      })
    })

    context('when registryId changes', () => {
      const newRegistryId = 3
      const dataWithRegistry = { registryId: newRegistryId }

      def('subject', () => $service.updateCatalogItemEndPoint(itemId, dataWithRegistry, isCLI, transaction))

      beforeEach(() => {
        $sandbox.stub(RegistryManager, 'findOne').resolves({ id: newRegistryId })
        $sandbox.stub(ReconcileOutboxManager, 'enqueueAgentPropagation').resolves()
        $sandbox.stub(MicroserviceManager, 'findAllWithStatuses').resolves([{ uuid: 'msvc-uuid' }])
        $sandbox.stub(MicroserviceManager, 'updateAndFind').resolves()
        $sandbox.stub(MicroserviceManager, 'update').resolves()
        $sandbox.stub(ChangeTrackingService, 'update').resolves()
      })

      it('enqueues background propagation without sync microservice fan-out', async () => {
        await $subject
        expect(RegistryManager.findOne).to.have.been.calledWith({ id: newRegistryId }, transaction)
        expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledOnceWith({
          scope: 'catalog',
          reason: 'registry_id_updated',
          catalogItemId: itemId,
          registryId: newRegistryId,
          actions: ['propagate_registry_id', 'rebuild', 'notify_microservices']
        }, transaction)
        expect(MicroserviceManager.findAllWithStatuses).to.not.have.been.called
        expect(MicroserviceManager.updateAndFind).to.not.have.been.called
        expect(MicroserviceManager.update).to.not.have.been.called
        expect(CatalogItemManager.update).to.have.been.calledWith(
          { id: itemId },
          sinon.match({ registryId: newRegistryId }),
          transaction
        )
      })
    })

    context('when registryId is invalid', () => {
      def('subject', () => $service.updateCatalogItemEndPoint(itemId, { registryId: 99 }, isCLI, transaction))

      beforeEach(() => {
        $sandbox.stub(RegistryManager, 'findOne').resolves(null)
        $sandbox.stub(ReconcileOutboxManager, 'enqueueAgentPropagation').resolves()
      })

      it('rejects with NotFoundError before enqueue', async () => {
        await expect($subject).to.be.rejectedWith(Errors.NotFoundError)
        expect(ReconcileOutboxManager.enqueueAgentPropagation).to.not.have.been.called
        expect(CatalogItemManager.update).to.not.have.been.called
      })
    })
  })

  describe('system catalog item lookups', () => {
    beforeEach(() => {
      $sandbox.stub(CatalogItemManager, 'findOne').resolves(buildCatalogItem({ category: 'SYSTEM' }))
    })

    it('.getNatsCatalogItem() queries NATs system item', async () => {
      await CatalogService.getNatsCatalogItem(transaction)
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: 'NATs',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        registry_id: 1
      }, transaction)
    })

    it('.getRouterCatalogItem() queries router system item', async () => {
      await CatalogService.getRouterCatalogItem(transaction)
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: DBConstants.ROUTER_CATALOG_NAME,
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        registry_id: 1
      }, transaction)
    })

    it('.getDebugCatalogItem() queries debug system item', async () => {
      await CatalogService.getDebugCatalogItem(transaction)
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: DBConstants.DEBUG_CATALOG_NAME,
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        registry_id: 1
      }, transaction)
    })

    it('.getBluetoothCatalogItem() queries RESTBlue system item', async () => {
      await CatalogService.getBluetoothCatalogItem(transaction)
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: 'RESTBlue',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        registry_id: 1
      }, transaction)
    })

    it('.getHalCatalogItem() queries HAL system item', async () => {
      await CatalogService.getHalCatalogItem(transaction)
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: 'HAL',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        registry_id: 1
      }, transaction)
    })
  })
})
