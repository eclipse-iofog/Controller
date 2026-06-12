const { expect } = require('chai')
const sinon = require('sinon')

const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const MicroservicesService = require('../../../src/services/microservices-service')
const AppHelper = require('../../../src/helpers/app-helper')
const Validator = require('../../../src/schemas')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const MicroservicePortService = require('../../../src/services/microservice-ports/microservice-port')
const CatalogItemImageManager = require('../../../src/data/managers/catalog-item-image-manager')
const MicroserviceStatusManager = require('../../../src/data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../../../src/data/managers/microservice-exec-status-manager')
const RegistryManager = require('../../../src/data/managers/registry-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ServiceManager = require('../../../src/data/managers/service-manager')
const VolumeMappingManager = require('../../../src/data/managers/volume-mapping-manager')
const MicroserviceExtraHostManager = require('../../../src/data/managers/microservice-extra-host-manager')
const MicroserviceEnvManager = require('../../../src/data/managers/microservice-env-manager')
const MicroserviceArgManager = require('../../../src/data/managers/microservice-arg-manager')
const MicroserviceCdiDevManager = require('../../../src/data/managers/microservice-cdi-device-manager')
const MicroserviceCapAddManager = require('../../../src/data/managers/microservice-cap-add-manager')
const MicroserviceCapDropManager = require('../../../src/data/managers/microservice-cap-drop-manager')
const MicroserviceHealthCheckManager = require('../../../src/data/managers/microservice-healthcheck-manager')
const RbacRoleManager = require('../../../src/data/managers/rbac-role-manager')
const RbacServiceAccountManager = require('../../../src/data/managers/rbac-service-account-manager')
const NatsAuthService = require('../../../src/services/nats-auth-service')
const Errors = require('../../../src/helpers/errors')

const transaction = {}
const isCLI = true

function buildMicroserviceRecord (fields = {}) {
  return {
    uuid: 'msvc-uuid',
    name: 'test-msvc',
    applicationId: 42,
    iofogUuid: 'fog-uuid',
    registryId: 1,
    delete: false,
    catalogItem: null,
    isController: false,
    logSize: 1024,
    getPorts: () => Promise.resolve([]),
    ...fields
  }
}

function stubBuildGetResponseDeps (sandbox) {
  sandbox.stub(MicroservicePortService, 'getPortMappings').resolves([])
  sandbox.stub(MicroserviceExtraHostManager, 'findAll').resolves([])
  sandbox.stub(CatalogItemImageManager, 'findAll').resolves([])
  sandbox.stub(VolumeMappingManager, 'findAll').resolves([])
  sandbox.stub(MicroserviceEnvManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceArgManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceCdiDevManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceCapAddManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceCapDropManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceStatusManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceExecStatusManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceHealthCheckManager, 'findAllExcludeFields').resolves([])
}

function stubServiceAccountDeps (sandbox) {
  sandbox.stub(VolumeMappingManager, 'findOne').resolves(null)
  sandbox.stub(VolumeMappingManager, 'create').resolves({ uuid: 'vol-uuid' })
  sandbox.stub(RbacRoleManager, 'getRoleWithRules').resolves({ name: 'microservice' })
  sandbox.stub(RbacServiceAccountManager, 'findOneByMicroserviceUuid').resolves(null)
  sandbox.stub(RbacServiceAccountManager, 'createServiceAccount').resolves({ id: 1 })
}

function stubCreateMicroserviceDeps (sandbox, { msvcUuid = 'msvc-uuid', appId = 42, fogUuid = 'fog-uuid' } = {}) {
  const fog = { uuid: fogUuid, archId: 1, name: 'edge-1', availableRuntimes: [] }
  const application = { id: appId, name: 'my-app', isSystem: false, natsAccess: false }
  const created = buildMicroserviceRecord({
    uuid: msvcUuid,
    name: 'new-msvc',
    applicationId: appId,
    iofogUuid: fogUuid
  })

  sandbox.stub(Validator, 'validate').resolves(true)
  sandbox.stub(FogManager, 'findOne').resolves(fog)
  sandbox.stub(ApplicationManager, 'findOne').resolves(application)
  sandbox.stub(RegistryManager, 'findOne').resolves({ id: 1 })
  sandbox.stub(AppHelper, 'generateUUID').returns(msvcUuid)
  sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
  sandbox.stub(MicroserviceManager, 'create').resolves(created)
  sandbox.stub(MicroserviceManager, 'findOne').callsFake((where) => {
    if (where && where.name) {
      return Promise.resolve(null)
    }
    if (where && where.uuid) {
      return Promise.resolve({ uuid: msvcUuid, applicationId: appId })
    }
    return Promise.resolve(null)
  })
  sandbox.stub(MicroservicePortService, 'validatePortMappings').resolves()
  sandbox.stub(CatalogItemImageManager, 'bulkCreate').resolves()
  sandbox.stub(MicroserviceStatusManager, 'create').resolves()
  sandbox.stub(MicroserviceExecStatusManager, 'create').resolves()
  sandbox.stub(ChangeTrackingService, 'update').resolves()
  stubServiceAccountDeps(sandbox)
}

function stubUpdateMicroserviceDeps (sandbox, existing) {
  const fog = { uuid: existing.iofogUuid, archId: 1, name: 'edge-1', availableRuntimes: [] }

  sandbox.stub(MicroserviceManager, 'findOne').resolves(existing)
  sandbox.stub(Validator, 'validate').resolves(true)
  sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
  sandbox.stub(FogManager, 'findOne').resolves(fog)
  sandbox.stub(MicroserviceManager, 'findOneWithCategory').resolves({
    ...existing,
    catalogItem: existing.catalogItem || null,
    getPorts: () => Promise.resolve([]),
    getImages: () => Promise.resolve([])
  })
  sandbox.stub(CatalogItemImageManager, 'findAll').resolves([])
  sandbox.stub(ApplicationManager, 'findOne').resolves({ id: existing.applicationId, natsAccess: false })
  sandbox.stub(MicroserviceManager, 'updateAndFind').resolves(existing)
  sandbox.stub(MicroserviceExtraHostManager, 'findAll').resolves([])
  sandbox.stub(ServiceManager, 'findOne').resolves(null)
  sandbox.stub(ChangeTrackingService, 'update').resolves()
  stubServiceAccountDeps(sandbox)
}

describe('Microservices Service', () => {
  def('service', () => MicroservicesService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.listMicroservicesEndPoint()', () => {
    const application = { id: 42, name: 'my-app', isSystem: false }
    const microserviceRow = {
      dataValues: buildMicroserviceRecord(),
      uuid: 'msvc-uuid',
      applicationId: 42
    }

    def('subject', () => $service.listMicroservicesEndPoint({ applicationName: 'my-app' }, isCLI, transaction))

    beforeEach(() => {
      stubBuildGetResponseDeps($sandbox)
      $sandbox.stub(ApplicationManager, 'findOne').resolves(application)
      $sandbox.stub(MicroserviceManager, 'findAllExcludeFields').resolves([microserviceRow])
    })

    it('lists microservices for an application', async () => {
      const result = await $subject
      expect(MicroserviceManager.findAllExcludeFields).to.have.been.calledWith(
        { applicationId: 42, delete: false },
        transaction
      )
      expect(result.microservices).to.have.length(1)
      expect(result.microservices[0].uuid).to.equal('msvc-uuid')
    })

    context('when application is missing', () => {
      beforeEach(() => {
        ApplicationManager.findOne.rejects(new Errors.NotFoundError('app missing'))
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })

  describe('.getMicroserviceEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const microserviceRow = {
      dataValues: buildMicroserviceRecord({ uuid: msvcUuid, logSize: 1024 }),
      uuid: msvcUuid
    }

    def('subject', () => $service.getMicroserviceEndPoint(msvcUuid, isCLI, transaction))

    beforeEach(() => {
      stubBuildGetResponseDeps($sandbox)
      $sandbox.stub(ApplicationManager, 'findOne').resolves({ name: 'my-app' })
      $sandbox.stub(MicroserviceManager, 'findOneExcludeFields').resolves(microserviceRow)
    })

    it('returns enriched microservice data', async () => {
      const result = await $subject
      expect(MicroserviceManager.findOneExcludeFields).to.have.been.calledWith(
        { uuid: msvcUuid, delete: false },
        transaction
      )
      expect(result.uuid).to.equal(msvcUuid)
    })

    context('when microservice is missing', () => {
      beforeEach(() => {
        MicroserviceManager.findOneExcludeFields.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })

    context('when called from REST (non-CLI)', () => {
      def('subject', () => $service.getMicroserviceEndPoint(msvcUuid, false, transaction))

      beforeEach(() => {
        $sandbox.stub(MicroserviceManager, 'findMicroserviceOnGet').resolves(microserviceRow)
      })

      it('validates user access before read', async () => {
        await $subject
        expect(MicroserviceManager.findMicroserviceOnGet).to.have.been.calledWith({ uuid: msvcUuid }, transaction)
      })
    })
  })

  describe('.createMicroserviceEndPoint()', () => {
    const msvcUuid = 'new-msvc-uuid'
    const microserviceData = {
      name: 'new-msvc',
      application: 'my-app',
      iofogUuid: 'fog-uuid',
      images: [{ containerImage: 'demo:latest', archId: 1 }],
      registryId: 1
    }

    def('subject', () => $service.createMicroserviceEndPoint(microserviceData, isCLI, transaction))

    beforeEach(() => {
      stubCreateMicroserviceDeps($sandbox, { msvcUuid })
    })

    it('validates input and creates a microservice', async () => {
      const result = await $subject
      expect(Validator.validate).to.have.been.calledWith(microserviceData, Validator.schemas.microserviceCreate)
      expect(MicroserviceManager.create).to.have.been.calledOnce
      expect(RbacServiceAccountManager.createServiceAccount).to.have.been.calledOnce
      expect(result).to.eql({ uuid: msvcUuid, name: 'new-msvc' })
    })

    it('rejects top-level natsAccess (use natsConfig)', () => {
      const badPayload = { ...microserviceData, natsAccess: true }
      return expect(
        $service.createMicroserviceEndPoint(badPayload, isCLI, transaction)
      ).to.be.rejectedWith('natsAccess must be provided under natsConfig.natsAccess')
    })

    context('when fog is missing', () => {
      beforeEach(() => {
        FogManager.findOne.resolves(null)
      })

      it('rejects with ValidationError', () => expect($subject).to.be.rejectedWith(Errors.ValidationError))
    })
  })

  describe('.updateMicroserviceEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const existing = buildMicroserviceRecord({
      uuid: msvcUuid,
      name: 'immutable-name',
      catalogItem: null
    })

    def('subject', () => $service.updateMicroserviceEndPoint(msvcUuid, $updateData, isCLI, transaction))
    def('updateData', () => ({ config: '{"k":"v"}' }))

    beforeEach(() => {
      stubUpdateMicroserviceDeps($sandbox, existing)
    })

    it('updates mutable fields', async () => {
      await $subject
      expect(MicroserviceManager.updateAndFind).to.have.been.called
      expect(ChangeTrackingService.update).to.have.been.called
    })

    context('when renaming', () => {
      def('updateData', () => ({ name: 'new-name' }))

      it('rejects rename attempts', () => expect($subject).to.be.rejectedWith('Microservice Resource Name is immutable'))
    })

    context('when microservice is controller', () => {
      beforeEach(() => {
        MicroserviceManager.findOneWithCategory.resolves({
          ...existing,
          isController: true,
          catalogItem: null,
          getPorts: () => Promise.resolve([]),
          getImages: () => Promise.resolve([])
        })
      })

      it('rejects updates', () => expect($subject).to.be.rejectedWith(Errors.ValidationError))
    })

    context('when microservice is system catalog', () => {
      beforeEach(() => {
        MicroserviceManager.findOneWithCategory.resolves({
          ...existing,
          isController: false,
          catalogItem: { category: 'SYSTEM' },
          getPorts: () => Promise.resolve([]),
          getImages: () => Promise.resolve([])
        })
      })

      it('rejects updates', () => expect($subject).to.be.rejectedWith(Errors.ValidationError))
    })
  })

  describe('.deleteMicroserviceEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const microservice = buildMicroserviceRecord({
      uuid: msvcUuid,
      catalogItem: null
    })

    def('subject', () => $service.deleteMicroserviceEndPoint(msvcUuid, {}, false, transaction))

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOneWithStatusAndCategory').resolves(microservice)
      $sandbox.stub(ServiceManager, 'findOne').resolves(null)
      $sandbox.stub(RbacServiceAccountManager, 'deleteByMicroserviceUuid').resolves()
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(NatsAuthService, 'revokeMicroserviceUser').resolves()
      $sandbox.stub(MicroservicePortService, 'deletePortMappings').resolves()
      $sandbox.stub(MicroserviceManager, 'delete').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('deletes a user microservice', async () => {
      await $subject
      expect(MicroserviceManager.delete).to.have.been.calledWith({ uuid: msvcUuid }, transaction)
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        microservice.iofogUuid,
        ChangeTrackingService.events.microserviceList,
        transaction
      )
    })

    context('when microservice is controller', () => {
      beforeEach(() => {
        MicroserviceManager.findOneWithStatusAndCategory.resolves({
          ...microservice,
          isController: true
        })
      })

      it('forbids deletion via REST', () => expect($subject).to.be.rejectedWith(Errors.ForbiddenError))
    })

    context('when microservice is system catalog', () => {
      beforeEach(() => {
        MicroserviceManager.findOneWithStatusAndCategory.resolves({
          ...microservice,
          catalogItem: { category: 'SYSTEM' }
        })
      })

      it('forbids deletion via REST', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })

  describe('.createPortMappingEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const portMappingData = { internal: 8080, external: 18080 }
    const microservice = buildMicroserviceRecord({ uuid: msvcUuid })
    const agent = { uuid: 'fog-uuid', name: 'edge-1' }
    const createdMapping = { portInternal: 8080, portExternal: 18080 }

    def('subject', () => $service.createPortMappingEndPoint(msvcUuid, portMappingData, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(MicroserviceManager, 'findMicroserviceOnGet').resolves(microservice)
      $sandbox.stub(MicroserviceManager, 'findOne').resolves(microservice)
      $sandbox.stub(FogManager, 'findOne').resolves(agent)
      $sandbox.stub(MicroservicePortService, 'validatePortMapping').resolves()
      $sandbox.stub(MicroservicePortService, 'createPortMapping').resolves(createdMapping)
    })

    it('validates and delegates port mapping creation', async () => {
      const result = await $subject
      expect(Validator.validate).to.have.been.calledWith(portMappingData, Validator.schemas.portsCreate)
      expect(MicroserviceManager.findMicroserviceOnGet).to.have.been.calledWith({ uuid: msvcUuid }, transaction)
      expect(MicroservicePortService.validatePortMapping).to.have.been.calledWith(agent, portMappingData, {}, transaction)
      expect(MicroservicePortService.createPortMapping).to.have.been.calledWith(microservice, portMappingData, transaction)
      expect(result).to.equal(createdMapping)
    })

    context('when microservice is missing', () => {
      beforeEach(() => {
        MicroserviceManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })
})
