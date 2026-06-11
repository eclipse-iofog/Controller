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

    context('when images are updated for in-use catalog item', () => {
      const microservice = { uuid: 'msvc-uuid', iofogUuid: 'fog-uuid' }
      const dataWithImages = {
        description: 'updated',
        images: [{ containerImage: 'demo:v2', archId: 1 }]
      }

      def('subject', () => $service.updateCatalogItemEndPoint(itemId, dataWithImages, isCLI, transaction))

      beforeEach(() => {
        $sandbox.stub(CatalogItemImageManager, 'updateOrCreate').resolves()
        $sandbox.stub(MicroserviceManager, 'findAllWithStatuses').resolves([microservice])
        $sandbox.stub(MicroserviceManager, 'updateAndFind').resolves(microservice)
        $sandbox.stub(ChangeTrackingService, 'update').resolves()
      })

      it('marks microservices for rebuild', async () => {
        await $subject
        expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(
          { uuid: microservice.uuid },
          { rebuild: true },
          transaction
        )
        expect(ChangeTrackingService.update).to.have.been.calledWith(
          microservice.iofogUuid,
          ChangeTrackingService.events.microserviceCommon,
          transaction
        )
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
        publisher: 'Datasance',
        registry_id: 1
      }, transaction)
    })

    it('.getRouterCatalogItem() queries router system item', async () => {
      await CatalogService.getRouterCatalogItem(transaction)
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: DBConstants.ROUTER_CATALOG_NAME,
        category: 'SYSTEM',
        publisher: 'Datasance',
        registry_id: 1
      }, transaction)
    })

    it('.getDebugCatalogItem() queries debug system item', async () => {
      await CatalogService.getDebugCatalogItem(transaction)
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: DBConstants.DEBUG_CATALOG_NAME,
        category: 'SYSTEM',
        publisher: 'Datasance',
        registry_id: 1
      }, transaction)
    })

    it('.getBluetoothCatalogItem() queries RESTBlue system item', async () => {
      await CatalogService.getBluetoothCatalogItem(transaction)
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: 'RESTBlue',
        category: 'SYSTEM',
        publisher: 'Datasance',
        registry_id: 1
      }, transaction)
    })

    it('.getHalCatalogItem() queries HAL system item', async () => {
      await CatalogService.getHalCatalogItem(transaction)
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: 'HAL',
        category: 'SYSTEM',
        publisher: 'Datasance',
        registry_id: 1
      }, transaction)
    })
  })
})
