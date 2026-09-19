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
const MicroserviceEntrypointManager = require('../../../src/data/managers/microservice-entrypoint-manager')
const MicroserviceDeviceManager = require('../../../src/data/managers/microservice-device-manager')
const MicroserviceTmpfsManager = require('../../../src/data/managers/microservice-tmpfs-manager')
const MicroserviceUlimitManager = require('../../../src/data/managers/microservice-ulimit-manager')
const MicroserviceModelManager = require('../../../src/data/managers/microservice-model-manager')
const MicroserviceModelItemManager = require('../../../src/data/managers/microservice-model-item-manager')
const MicroserviceCdiDevManager = require('../../../src/data/managers/microservice-cdi-device-manager')
const MicroserviceCapAddManager = require('../../../src/data/managers/microservice-cap-add-manager')
const MicroserviceCapDropManager = require('../../../src/data/managers/microservice-cap-drop-manager')
const MicroserviceHealthCheckManager = require('../../../src/data/managers/microservice-healthcheck-manager')
const VolumeMountService = require('../../../src/services/volume-mount-service')
const RuntimeClassService = require('../../../src/services/runtime-class-service')
const ModelService = require('../../../src/services/model-service')
const MicroserviceTemplateService = require('../../../src/services/microservice-template-service')
const FleetModelManager = require('../../../src/data/managers/fleet-model-manager')
const RbacRoleManager = require('../../../src/data/managers/rbac-role-manager')
const ErrorMessages = require('../../../src/helpers/error-messages')
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

function stubChildTableDeps (sandbox) {
  sandbox.stub(MicroserviceArgManager, 'findAll').resolves([])
  sandbox.stub(MicroserviceArgManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceArgManager, 'create').resolves()
  sandbox.stub(MicroserviceArgManager, 'delete').resolves()
  sandbox.stub(MicroserviceEntrypointManager, 'findAll').resolves([])
  sandbox.stub(MicroserviceEntrypointManager, 'create').resolves()
  sandbox.stub(MicroserviceEntrypointManager, 'delete').resolves()
  sandbox.stub(MicroserviceDeviceManager, 'findAll').resolves([])
  sandbox.stub(MicroserviceDeviceManager, 'create').resolves()
  sandbox.stub(MicroserviceDeviceManager, 'delete').resolves()
  sandbox.stub(MicroserviceTmpfsManager, 'findAll').resolves([])
  sandbox.stub(MicroserviceTmpfsManager, 'create').resolves()
  sandbox.stub(MicroserviceTmpfsManager, 'delete').resolves()
  sandbox.stub(MicroserviceUlimitManager, 'findAll').resolves([])
  sandbox.stub(MicroserviceUlimitManager, 'create').resolves()
  sandbox.stub(MicroserviceUlimitManager, 'delete').resolves()
  sandbox.stub(MicroserviceModelManager, 'findOne').resolves(null)
  sandbox.stub(MicroserviceModelManager, 'create').resolves()
  sandbox.stub(MicroserviceModelManager, 'delete').resolves()
  sandbox.stub(MicroserviceModelItemManager, 'findAll').resolves([])
  sandbox.stub(MicroserviceModelItemManager, 'create').resolves()
  sandbox.stub(MicroserviceModelItemManager, 'delete').resolves()
}

function stubBuildGetResponseDeps (sandbox) {
  sandbox.stub(MicroservicePortService, 'getPortMappings').resolves([])
  sandbox.stub(MicroserviceExtraHostManager, 'findAll').resolves([])
  sandbox.stub(CatalogItemImageManager, 'findAll').resolves([])
  sandbox.stub(VolumeMappingManager, 'findAll').resolves([])
  sandbox.stub(MicroserviceEnvManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceCdiDevManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceCapAddManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceCapDropManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceStatusManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceExecStatusManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(MicroserviceHealthCheckManager, 'findAllExcludeFields').resolves([])
  sandbox.stub(RbacServiceAccountManager, 'findOneByMicroserviceUuid').resolves(null)
  stubChildTableDeps(sandbox)
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
  sandbox.stub(MicroservicePortService, 'switchOnUpdateFlagsForMicroservicesForPortMapping').resolves()
  sandbox.stub(CatalogItemImageManager, 'bulkCreate').resolves()
  sandbox.stub(MicroserviceStatusManager, 'create').resolves()
  sandbox.stub(MicroserviceExecStatusManager, 'create').resolves()
  sandbox.stub(ChangeTrackingService, 'update').resolves()
  sandbox.stub(VolumeMappingManager, 'bulkCreate').resolves()
  stubServiceAccountDeps(sandbox)
  stubChildTableDeps(sandbox)
}

function stubUpdateMicroserviceDeps (sandbox, existing) {
  const fog = { uuid: existing.iofogUuid, archId: 1, name: 'edge-1', availableRuntimes: [] }

  sandbox.stub(MicroserviceManager, 'findOne').resolves(existing)
  sandbox.stub(Validator, 'validate').resolves(true)
  sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
  sandbox.stub(FogManager, 'findOne').resolves(fog)
  sandbox.stub(RegistryManager, 'findOne').resolves({ id: existing.registryId || 1, type: 'oci' })
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
  sandbox.stub(VolumeMappingManager, 'delete').resolves()
  sandbox.stub(VolumeMappingManager, 'findAll').resolves([])
  stubServiceAccountDeps(sandbox)
  stubChildTableDeps(sandbox)
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

  describe('.buildGetMicroserviceResponse()', () => {
    const msvcUuid = 'msvc-uuid'
    const roleRef = {
      kind: 'Role',
      name: 'custom-role',
      apiGroup: 'edgelet.iofog.org/v1'
    }

    def('subject', () => $service.buildGetMicroserviceResponse($microservice, transaction))

    beforeEach(() => {
      stubBuildGetResponseDeps($sandbox)
      $sandbox.stub(ApplicationManager, 'findOne').resolves({ name: 'my-app' })
    })

    context('when serviceAccount is preloaded on the microservice', () => {
      def('microservice', () => ({
        uuid: msvcUuid,
        name: 'test-msvc',
        applicationId: 42,
        logSize: 1024,
        serviceAccount: { name: 'test-msvc', roleRef }
      }))

      it('returns shaped serviceAccount with roleRef only', async () => {
        const result = await $subject
        expect(RbacServiceAccountManager.findOneByMicroserviceUuid).to.not.have.been.called
        expect(result.serviceAccount).to.eql({ roleRef })
      })

      it('does not leak raw serviceAccount database fields', async () => {
        const result = await $subject
        expect(result.serviceAccount).to.not.have.property('id')
        expect(result.serviceAccount).to.not.have.property('microserviceUuid')
        expect(result.serviceAccount).to.not.have.property('roleId')
      })
    })

    context('when serviceAccount is not preloaded', () => {
      def('microservice', () => ({
        uuid: msvcUuid,
        name: 'test-msvc',
        applicationId: 42,
        logSize: 1024
      }))

      beforeEach(() => {
        RbacServiceAccountManager.findOneByMicroserviceUuid.resolves({
          name: 'test-msvc',
          roleRef
        })
      })

      it('loads serviceAccount by microservice uuid', async () => {
        const result = await $subject
        expect(RbacServiceAccountManager.findOneByMicroserviceUuid).to.have.been.calledWith(msvcUuid, transaction)
        expect(result.serviceAccount).to.eql({ roleRef })
      })
    })

    context('when microservice has no service account', () => {
      def('microservice', () => ({
        uuid: msvcUuid,
        name: 'test-msvc',
        applicationId: 42,
        logSize: 1024
      }))

      it('returns null serviceAccount', async () => {
        const result = await $subject
        expect(result.serviceAccount).to.equal(null)
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

    context('when volumeMappings include a system serviceAccount volume', () => {
      const userVolume = {
        hostDestination: 'nats-creds-data',
        containerDestination: '/etc/nats/creds',
        accessMode: 'ro',
        type: 'volume'
      }
      const serviceAccountVolume = {
        hostDestination: 'new-msvc',
        containerDestination: '/var/run/secrets/edgelet.iofog.org/serviceaccount',
        accessMode: 'ro',
        type: 'serviceAccount'
      }
      const payloadWithServiceAccountVolume = {
        name: 'new-msvc',
        application: 'my-app',
        iofogUuid: 'fog-uuid',
        images: [{ containerImage: 'demo:latest', archId: 1 }],
        registryId: 1,
        volumeMappings: [userVolume, serviceAccountVolume, serviceAccountVolume]
      }

      def('subject', () => $service.createMicroserviceEndPoint(payloadWithServiceAccountVolume, isCLI, transaction))

      it('strips serviceAccount volumes and creates only user mappings', async () => {
        await $subject
        expect(VolumeMappingManager.bulkCreate).to.have.been.calledOnce
        const [mappings] = VolumeMappingManager.bulkCreate.firstCall.args
        expect(mappings).to.have.length(1)
        expect(mappings[0]).to.include(userVolume)
        expect(VolumeMappingManager.create).to.have.been.called
      })
    })

    context('when volumeMappings include scope', () => {
      const basePayload = {
        name: 'new-msvc',
        application: 'my-app',
        iofogUuid: 'fog-uuid',
        images: [{ containerImage: 'demo:latest', archId: 1 }],
        registryId: 1
      }

      it('stores private when type is volume and scope is omitted', async () => {
        await $service.createMicroserviceEndPoint({
          ...basePayload,
          volumeMappings: [{
            hostDestination: 'data',
            containerDestination: '/data',
            accessMode: 'rw',
            type: 'volume'
          }]
        }, isCLI, transaction)

        const [mappings] = VolumeMappingManager.bulkCreate.firstCall.args
        expect(mappings[0].scope).to.equal('private')
      })

      it('stores private when type is volume and scope is empty or null', async () => {
        for (const scope of ['', null]) {
          VolumeMappingManager.bulkCreate.resetHistory()
          await $service.createMicroserviceEndPoint({
            ...basePayload,
            volumeMappings: [{
              hostDestination: 'data',
              containerDestination: '/data',
              accessMode: 'rw',
              type: 'volume',
              scope
            }]
          }, isCLI, transaction)

          const [mappings] = VolumeMappingManager.bulkCreate.firstCall.args
          expect(mappings[0].scope).to.equal('private')
        }
      })

      it('stores shared when type is volume and scope is Shared', async () => {
        await $service.createMicroserviceEndPoint({
          ...basePayload,
          volumeMappings: [{
            hostDestination: 'nodered-config',
            containerDestination: '/data',
            accessMode: 'rw',
            type: 'volume',
            scope: 'Shared'
          }]
        }, isCLI, transaction)

        const [mappings] = VolumeMappingManager.bulkCreate.firstCall.args
        expect(mappings[0]).to.include({
          hostDestination: 'nodered-config',
          type: 'volume',
          scope: 'shared'
        })
      })

      it('rejects unknown scope on type volume', async () => {
        await expect($service.createMicroserviceEndPoint({
          ...basePayload,
          volumeMappings: [{
            hostDestination: 'data',
            containerDestination: '/data',
            accessMode: 'rw',
            type: 'volume',
            scope: 'Shareed'
          }]
        }, isCLI, transaction)).to.be.rejectedWith(Errors.ValidationError, /Unknown volume mapping scope/)
      })

      it('stores private when type is omitted and scope is shared', async () => {
        await $service.createMicroserviceEndPoint({
          ...basePayload,
          volumeMappings: [{
            hostDestination: '/host/data',
            containerDestination: '/data',
            accessMode: 'rw',
            scope: 'shared'
          }]
        }, isCLI, transaction)

        const [mappings] = VolumeMappingManager.bulkCreate.firstCall.args
        expect(mappings[0]).to.include({ type: 'bind', scope: 'private' })
      })

      it('stores private when type is bind and scope is unknown', async () => {
        await $service.createMicroserviceEndPoint({
          ...basePayload,
          volumeMappings: [{
            hostDestination: '/host/data',
            containerDestination: '/data',
            accessMode: 'rw',
            type: 'bind',
            scope: 'nope'
          }]
        }, isCLI, transaction)

        const [mappings] = VolumeMappingManager.bulkCreate.firstCall.args
        expect(mappings[0]).to.include({ type: 'bind', scope: 'private' })
      })

      it('persists both a private and a shared mapping with the same volume name', async () => {
        await $service.createMicroserviceEndPoint({
          ...basePayload,
          volumeMappings: [{
            hostDestination: 'config',
            containerDestination: '/private-config',
            accessMode: 'rw',
            type: 'volume'
          }, {
            hostDestination: 'config',
            containerDestination: '/shared-config',
            accessMode: 'rw',
            type: 'volume',
            scope: 'shared'
          }]
        }, isCLI, transaction)

        const [mappings] = VolumeMappingManager.bulkCreate.firstCall.args
        expect(mappings).to.have.length(2)
        expect(mappings[0]).to.include({
          hostDestination: 'config',
          containerDestination: '/private-config',
          scope: 'private'
        })
        expect(mappings[1]).to.include({
          hostDestination: 'config',
          containerDestination: '/shared-config',
          scope: 'shared'
        })
      })

      it('persists shared with read-only access', async () => {
        await $service.createMicroserviceEndPoint({
          ...basePayload,
          volumeMappings: [{
            hostDestination: 'nodered-config',
            containerDestination: '/data',
            accessMode: 'ro',
            type: 'volume',
            scope: 'shared'
          }]
        }, isCLI, transaction)

        const [mappings] = VolumeMappingManager.bulkCreate.firstCall.args
        expect(mappings[0]).to.include({
          accessMode: 'ro',
          scope: 'shared'
        })
      })

      it('rejects a volume name that is not a valid local volume name', async () => {
        await expect($service.createMicroserviceEndPoint({
          ...basePayload,
          volumeMappings: [{
            hostDestination: '../x',
            containerDestination: '/data',
            accessMode: 'rw',
            type: 'volume'
          }]
        }, isCLI, transaction)).to.be.rejectedWith(Errors.InvalidArgumentError, /invalid characters/)
      })
    })

    context('when runtime is set', () => {
      it('auto-links the runtime class on an edgelet fog', async () => {
        FogManager.findOne.resolves({
          uuid: 'fog-uuid',
          archId: 1,
          name: 'edge-1',
          availableRuntimes: ['spin'],
          containerEngine: 'edgelet'
        })
        const ensure = $sandbox.stub(RuntimeClassService, 'ensureRuntimeClassLinkedToFog').resolves(true)

        await $service.createMicroserviceEndPoint({
          ...microserviceData,
          runtime: 'spin'
        }, isCLI, transaction)

        expect(ensure).to.have.been.calledWith('fog-uuid', 'spin', transaction)
      })

      it('rejects when the runtime is not in availableRuntimes', async () => {
        FogManager.findOne.resolves({
          uuid: 'fog-uuid',
          archId: 1,
          name: 'edge-1',
          availableRuntimes: ['runc'],
          containerEngine: 'edgelet'
        })
        const ensure = $sandbox.stub(RuntimeClassService, 'ensureRuntimeClassLinkedToFog').resolves(true)

        await expect($service.createMicroserviceEndPoint({
          ...microserviceData,
          runtime: 'spin'
        }, isCLI, transaction)).to.be.rejectedWith(Errors.ValidationError, /not available/)
        expect(ensure).to.not.have.been.called
      })

      it('rejects when the runtime class row is missing', async () => {
        FogManager.findOne.resolves({
          uuid: 'fog-uuid',
          archId: 1,
          name: 'edge-1',
          availableRuntimes: ['spin'],
          containerEngine: 'edgelet'
        })
        $sandbox.stub(RuntimeClassService, 'ensureRuntimeClassLinkedToFog')
          .rejects(new Errors.ValidationError("RuntimeClass 'spin' does not exist"))

        await expect($service.createMicroserviceEndPoint({
          ...microserviceData,
          runtime: 'spin'
        }, isCLI, transaction)).to.be.rejectedWith(Errors.ValidationError, /does not exist/)
      })
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

    context('when runtime is set', () => {
      def('updateData', () => ({ runtime: 'spin' }))

      it('auto-links the runtime class on an edgelet fog', async () => {
        FogManager.findOne.resolves({
          uuid: existing.iofogUuid,
          archId: 1,
          name: 'edge-1',
          availableRuntimes: ['spin'],
          containerEngine: 'edgelet'
        })
        const ensure = $sandbox.stub(RuntimeClassService, 'ensureRuntimeClassLinkedToFog').resolves(true)

        await $subject
        expect(ensure).to.have.been.calledWith(existing.iofogUuid, 'spin', transaction)
      })
    })

    context('when renaming', () => {
      def('updateData', () => ({ name: 'new-name' }))

      it('rejects rename attempts', () => expect($subject).to.be.rejectedWith('Microservice Resource Name is immutable'))
    })

    context('when rebasing from a template', () => {
      def('updateData', () => ({
        template: {
          name: 'nginx-edge',
          variables: { port: '9090' }
        }
      }))

      beforeEach(() => {
        MicroserviceManager.findOne.callsFake((where) => {
          if (where && where.name && where.uuid) {
            return Promise.resolve(null)
          }
          return Promise.resolve(existing)
        })
        $sandbox.stub(CatalogItemImageManager, 'delete').resolves()
        $sandbox.stub(CatalogItemImageManager, 'bulkCreate').resolves()
        $sandbox.stub(FleetModelManager, 'findOne').resolves({ uuid: 'model-uuid', name: 'test-model' })
        $sandbox.stub(ModelService, 'ensureModelsLinkedToFog').resolves(['test-model'])
        $sandbox.stub(MicroserviceTemplateService, 'getMicroserviceDataFromTemplate').resolves({
          images: [{ containerImage: 'nginx:alpine', archId: 1 }],
          registryId: 1,
          commands: ['nginx', '-g', 'daemon off;'],
          models: {
            bindPath: '/models',
            permissions: 'ro',
            items: [{ name: 'test-model' }]
          }
        })
      })

      it('expands the template and preserves identity from the existing microservice', async () => {
        await $subject

        expect(MicroserviceTemplateService.getMicroserviceDataFromTemplate).to.have.been.calledWith(
          { name: 'nginx-edge', variables: { port: '9090' } },
          isCLI,
          transaction
        )
        expect(Validator.validate).to.have.been.calledWith(
          sinon.match({
            name: existing.name,
            iofogUuid: existing.iofogUuid,
            images: [{ containerImage: 'nginx:alpine', archId: 1 }]
          }),
          Validator.schemas.microserviceUpdate
        )
        expect(MicroserviceModelItemManager.create).to.have.been.calledWith(
          sinon.match({ name: 'test-model' }),
          transaction
        )
        expect(MicroserviceArgManager.create).to.have.been.calledWith(
          sinon.match({ cmd: 'nginx' }),
          transaction
        )
      })
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

    context('when disabling natsAccess via natsConfig', () => {
      const natsEnabled = buildMicroserviceRecord({
        uuid: msvcUuid,
        name: 'immutable-name',
        catalogItem: null,
        natsAccess: true,
        natsCredsSecretName: 'nats-creds-msvc'
      })

      def('updateData', () => ({ natsConfig: { natsAccess: false } }))

      beforeEach(() => {
        MicroserviceManager.findOne.resolves(natsEnabled)
        MicroserviceManager.findOneWithCategory.resolves({
          ...natsEnabled,
          catalogItem: null,
          getPorts: () => Promise.resolve([]),
          getImages: () => Promise.resolve([])
        })
        MicroserviceManager.updateAndFind.resolves({ ...natsEnabled, natsAccess: false })
        $sandbox.stub(NatsAuthService, 'revokeMicroserviceUser').resolves()
        $sandbox.stub(NatsAuthService, 'reissueUserForMicroservice').resolves()
        $sandbox.stub(NatsAuthService, 'ensureUserForMicroservice').resolves()
        $sandbox.stub(MicroserviceEnvManager, 'delete').resolves()
        $sandbox.stub(VolumeMountService, 'unlinkVolumeMountEndpoint').resolves()
        $sandbox.stub(MicroserviceManager, 'update').resolves()
      })

      it('revokes credentials and does not reissue when disabling', async () => {
        await $subject

        expect(NatsAuthService.revokeMicroserviceUser).to.have.been.calledOnceWith(msvcUuid, transaction)
        expect(NatsAuthService.reissueUserForMicroservice).to.not.have.been.called
        expect(NatsAuthService.ensureUserForMicroservice).to.not.have.been.called
        expect(MicroserviceEnvManager.delete).to.have.been.calledTwice
        expect(VolumeMappingManager.delete).to.have.been.calledOnce
      })
    })

    context('when volumeMappings include a system serviceAccount volume', () => {
      const userVolume = {
        hostDestination: 'nats-creds-data',
        containerDestination: '/etc/nats/creds',
        accessMode: 'ro',
        type: 'volume'
      }
      const serviceAccountVolume = {
        hostDestination: 'immutable-name',
        containerDestination: '/var/run/secrets/edgelet.iofog.org/serviceaccount',
        accessMode: 'ro',
        type: 'serviceAccount'
      }

      def('updateData', () => ({
        volumeMappings: [userVolume, serviceAccountVolume]
      }))

      it('strips serviceAccount volumes, updates user mappings, and re-injects service account volume', async () => {
        await $subject
        expect(VolumeMappingManager.delete).to.have.been.calledWith({ microserviceUuid: msvcUuid }, transaction)
        expect(VolumeMappingManager.create).to.have.been.calledTwice
        const [createdMapping] = VolumeMappingManager.create.firstCall.args
        expect(createdMapping).to.include({
          microserviceUuid: msvcUuid,
          hostDestination: userVolume.hostDestination,
          containerDestination: userVolume.containerDestination,
          accessMode: userVolume.accessMode,
          type: userVolume.type
        })
        const [injectedMapping] = VolumeMappingManager.create.secondCall.args
        expect(injectedMapping).to.include({
          microserviceUuid: msvcUuid,
          type: 'serviceAccount',
          containerDestination: '/var/run/secrets/edgelet.iofog.org/serviceaccount'
        })
      })
    })

    context('when volumeMappings change scope', () => {
      def('updateData', () => ({
        volumeMappings: [{
          hostDestination: 'nodered-config',
          containerDestination: '/data',
          accessMode: 'rw',
          type: 'volume',
          scope: 'shared'
        }]
      }))

      it('marks the microservice for rebuild and notifies the node', async () => {
        await $subject
        expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(
          { uuid: msvcUuid },
          sinon.match({ rebuild: true }),
          transaction
        )
        expect(VolumeMappingManager.create).to.have.been.calledWith(
          sinon.match({
            microserviceUuid: msvcUuid,
            hostDestination: 'nodered-config',
            type: 'volume',
            scope: 'shared'
          }),
          transaction
        )
        expect(ChangeTrackingService.update).to.have.been.calledWith(
          existing.iofogUuid,
          ChangeTrackingService.events.microserviceCommon,
          transaction
        )
      })
    })
  })

  describe('.updateSystemMicroserviceEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const existing = buildMicroserviceRecord({
      uuid: msvcUuid,
      name: 'controller',
      catalogItem: null,
      isController: true,
      schedule: 3
    })

    def('subject', () => $service.updateSystemMicroserviceEndPoint(msvcUuid, $updateData, isCLI, transaction))
    def('updateData', () => ({ config: '{"k":"v"}' }))

    beforeEach(() => {
      stubUpdateMicroserviceDeps($sandbox, existing)
    })

    context('when schedule is sent for controller microservice', () => {
      def('updateData', () => ({ schedule: 3 }))

      it('forces schedule to 0 for controller microservices', async () => {
        await $subject
        expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(
          { uuid: msvcUuid },
          sinon.match({ schedule: 0 }),
          transaction
        )
      })
    })

    it('keeps schedule at 0 when user omits schedule', async () => {
      await $subject
      expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(
        { uuid: msvcUuid },
        sinon.match({ schedule: 0 }),
        transaction
      )
    })

    context('when a controller microservice is sent a shared volume', () => {
      def('updateData', () => ({
        volumeMappings: [{
          hostDestination: 'data',
          containerDestination: '/data',
          accessMode: 'rw',
          type: 'volume',
          scope: 'shared'
        }]
      }))

      it('rejects shared scope on a controller microservice', () => {
        return expect($subject).to.be.rejectedWith(
          Errors.ValidationError,
          /not allowed on controller or system/
        )
      })
    })

    context('when microservice is not controller', () => {
      def('updateData', () => ({ schedule: 4 }))

      beforeEach(() => {
        MicroserviceManager.findOneWithCategory.resolves({
          ...existing,
          isController: false,
          schedule: 3,
          getPorts: () => Promise.resolve([]),
          getImages: () => Promise.resolve([])
        })
      })

      it('preserves user-provided schedule', async () => {
        await $subject
        expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(
          { uuid: msvcUuid },
          sinon.match({ schedule: 4 }),
          transaction
        )
      })
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
      expect(MicroservicePortService.validatePortMapping).to.have.been.calledWith(agent, portMappingData, transaction)
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

  describe('.stripUserServiceAccountVolumeMappings()', () => {
    it('removes serviceAccount entries in place and leaves user volumes', () => {
      const userVolume = {
        hostDestination: 'data',
        containerDestination: '/data',
        accessMode: 'rw',
        type: 'volume'
      }
      const serviceAccountVolume = {
        hostDestination: 'msvc',
        containerDestination: '/var/run/secrets/edgelet.iofog.org/serviceaccount',
        accessMode: 'ro',
        type: 'serviceAccount'
      }
      const volumeMappings = [userVolume, serviceAccountVolume, serviceAccountVolume]

      $service.stripUserServiceAccountVolumeMappings(volumeMappings)

      expect(volumeMappings).to.eql([userVolume])
    })

    it('no-ops for non-array input', () => {
      expect(() => $service.stripUserServiceAccountVolumeMappings(null)).to.not.throw()
      expect(() => $service.stripUserServiceAccountVolumeMappings(undefined)).to.not.throw()
    })
  })

  describe('.createVolumeMappingEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const microservice = buildMicroserviceRecord({ uuid: msvcUuid })

    def('subject', () => $service.createVolumeMappingEndPoint(msvcUuid, $volumeMappingData, isCLI, transaction))
    def('volumeMappingData', () => ({
      hostDestination: 'data',
      containerDestination: '/data',
      accessMode: 'rw',
      type: 'volume'
    }))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(MicroserviceManager, 'findMicroserviceOnGet').resolves(microservice)
      $sandbox.stub(ApplicationManager, 'findOne').resolves({ id: microservice.applicationId, isSystem: false })
      $sandbox.stub(VolumeMappingManager, 'findOne').resolves(null)
      $sandbox.stub(VolumeMappingManager, 'create').resolves({ uuid: 'vol-uuid' })
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('creates a user volume mapping', async () => {
      await $subject
      expect(VolumeMappingManager.create).to.have.been.calledOnce
    })

    it('persists default private scope and marks the microservice for rebuild', async () => {
      await $subject
      expect(VolumeMappingManager.create).to.have.been.calledWith(
        sinon.match({
          microserviceUuid: msvcUuid,
          hostDestination: 'data',
          type: 'volume',
          scope: 'private'
        }),
        transaction
      )
      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        { rebuild: true },
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        microservice.iofogUuid,
        ChangeTrackingService.events.microserviceCommon,
        transaction
      )
    })

    it('persists shared scope on type volume', async () => {
      await $service.createVolumeMappingEndPoint(msvcUuid, {
        hostDestination: 'nodered-config',
        containerDestination: '/data',
        accessMode: 'rw',
        type: 'volume',
        scope: 'Shared'
      }, isCLI, transaction)

      expect(VolumeMappingManager.create).to.have.been.calledWith(
        sinon.match({
          hostDestination: 'nodered-config',
          type: 'volume',
          scope: 'shared'
        }),
        transaction
      )
      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        { rebuild: true },
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        microservice.iofogUuid,
        ChangeTrackingService.events.microserviceCommon,
        transaction
      )
    })

      it('rejects bind when hostDestination is not an absolute path', () => {
        return expect($service.createVolumeMappingEndPoint(msvcUuid, {
          hostDestination: 'nodered-config',
          containerDestination: '/data',
          accessMode: 'rw',
          type: 'bind'
        }, isCLI, transaction)).to.be.rejectedWith(Errors.InvalidArgumentError, /absolute host path/)
      })

      it('stores private when type is bind and scope is shared', async () => {
        await $service.createVolumeMappingEndPoint(msvcUuid, {
          hostDestination: '/host/data',
          containerDestination: '/data',
          accessMode: 'rw',
          type: 'bind',
          scope: 'shared'
        }, isCLI, transaction)

      expect(VolumeMappingManager.create).to.have.been.calledWith(
        sinon.match({
          type: 'bind',
          scope: 'private'
        }),
        transaction
      )
    })

    it('rejects unknown scope on type volume', () => {
      return expect($service.createVolumeMappingEndPoint(msvcUuid, {
        hostDestination: 'data',
        containerDestination: '/data',
        accessMode: 'rw',
        type: 'volume',
        scope: 'Shareed'
      }, isCLI, transaction)).to.be.rejectedWith(Errors.ValidationError, /Unknown volume mapping scope/)
    })

    it('rejects shared scope on a system microservice', () => {
      ApplicationManager.findOne.resolves({ id: microservice.applicationId, isSystem: true })
      return expect($service.createVolumeMappingEndPoint(msvcUuid, {
        hostDestination: 'data',
        containerDestination: '/data',
        accessMode: 'rw',
        type: 'volume',
        scope: 'shared'
      }, isCLI, transaction)).to.be.rejectedWith(
        Errors.ValidationError,
        /not allowed on controller or system/
      )
    })

    it('rejects shared scope on a controller microservice', () => {
      MicroserviceManager.findMicroserviceOnGet.resolves(buildMicroserviceRecord({
        uuid: msvcUuid,
        isController: true
      }))
      return expect($service.createVolumeMappingEndPoint(msvcUuid, {
        hostDestination: 'data',
        containerDestination: '/data',
        accessMode: 'rw',
        type: 'volume',
        scope: 'shared'
      }, isCLI, transaction)).to.be.rejectedWith(
        Errors.ValidationError,
        /not allowed on controller or system/
      )
    })

    it('allows the same shared volume name on two user microservices on one node', async () => {
      const otherMs = buildMicroserviceRecord({ uuid: 'other-msvc', iofogUuid: 'fog-uuid' })
      MicroserviceManager.findMicroserviceOnGet.callsFake((where) => {
        if (where && where.uuid === 'other-msvc') {
          return Promise.resolve(otherMs)
        }
        return Promise.resolve(microservice)
      })
      const mapping = {
        hostDestination: 'nodered-config',
        containerDestination: '/data',
        accessMode: 'rw',
        type: 'volume',
        scope: 'shared'
      }

      await $service.createVolumeMappingEndPoint(msvcUuid, mapping, isCLI, transaction)
      await $service.createVolumeMappingEndPoint('other-msvc', { ...mapping }, isCLI, transaction)

      expect(VolumeMappingManager.create).to.have.been.calledTwice
      expect(VolumeMappingManager.create.firstCall.args[0]).to.include({
        microserviceUuid: msvcUuid,
        hostDestination: 'nodered-config',
        scope: 'shared'
      })
      expect(VolumeMappingManager.create.secondCall.args[0]).to.include({
        microserviceUuid: 'other-msvc',
        hostDestination: 'nodered-config',
        scope: 'shared'
      })
    })

    it('skips fog change tracking when the microservice has no node', async () => {
      MicroserviceManager.findMicroserviceOnGet.resolves(buildMicroserviceRecord({
        uuid: msvcUuid,
        iofogUuid: null
      }))

      await $subject

      expect(VolumeMappingManager.create).to.have.been.calledOnce
      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        { rebuild: true },
        transaction
      )
      expect(ChangeTrackingService.update).to.not.have.been.called
    })

    context('when type is serviceAccount', () => {
      def('volumeMappingData', () => ({
        hostDestination: 'immutable-name',
        containerDestination: '/var/run/secrets/edgelet.iofog.org/serviceaccount',
        accessMode: 'ro',
        type: 'serviceAccount'
      }))

      it('rejects direct creation of system-managed volume mappings', () => {
        return expect($subject).to.be.rejectedWith(
          'Volume mappings of type serviceAccount are system-managed and cannot be created by users'
        )
      })
    })
  })

  describe('.createSystemVolumeMappingEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const microservice = buildMicroserviceRecord({ uuid: msvcUuid })

    def('subject', () => $service.createSystemVolumeMappingEndPoint(msvcUuid, $volumeMappingData, isCLI, transaction))
    def('volumeMappingData', () => ({
      hostDestination: 'data',
      containerDestination: '/data',
      accessMode: 'rw',
      type: 'volume'
    }))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(MicroserviceManager, 'findOne').resolves(microservice)
      $sandbox.stub(ApplicationManager, 'findOne').resolves({ id: microservice.applicationId, isSystem: true })
      $sandbox.stub(VolumeMappingManager, 'findOne').resolves(null)
      $sandbox.stub(VolumeMappingManager, 'create').resolves({ uuid: 'vol-uuid' })
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('persists private scope and marks the system microservice for rebuild', async () => {
      await $subject
      expect(VolumeMappingManager.create).to.have.been.calledWith(
        sinon.match({
          microserviceUuid: msvcUuid,
          type: 'volume',
          scope: 'private'
        }),
        transaction
      )
      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        { rebuild: true },
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        microservice.iofogUuid,
        ChangeTrackingService.events.microserviceCommon,
        transaction
      )
    })

    it('rejects explicit shared scope on a system microservice volume', () => {
      return expect($service.createSystemVolumeMappingEndPoint(msvcUuid, {
        hostDestination: 'data',
        containerDestination: '/data',
        accessMode: 'rw',
        type: 'volume',
        scope: 'shared'
      }, isCLI, transaction)).to.be.rejectedWith(
        Errors.ValidationError,
        /not allowed on controller or system/
      )
    })
  })

  describe('.deleteVolumeMappingEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const mappingUuid = 'vol-uuid'
    const microservice = buildMicroserviceRecord({ uuid: msvcUuid })

    def('subject', () => $service.deleteVolumeMappingEndPoint(msvcUuid, mappingUuid, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOne').resolves(microservice)
      $sandbox.stub(VolumeMappingManager, 'findOne').resolves({
        uuid: mappingUuid,
        microserviceUuid: msvcUuid,
        type: 'volume'
      })
      $sandbox.stub(VolumeMappingManager, 'delete').resolves(1)
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('deletes the mapping and marks the microservice for rebuild', async () => {
      await $subject
      expect(VolumeMappingManager.delete).to.have.been.calledWith(
        { uuid: mappingUuid, microserviceUuid: msvcUuid },
        transaction
      )
      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        { rebuild: true },
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        microservice.iofogUuid,
        ChangeTrackingService.events.microserviceCommon,
        transaction
      )
    })

    it('rejects delete of system-managed serviceAccount mappings', () => {
      VolumeMappingManager.findOne.resolves({
        uuid: mappingUuid,
        microserviceUuid: msvcUuid,
        type: 'serviceAccount'
      })
      return expect($subject).to.be.rejectedWith(
        'Volume mappings of type serviceAccount are system-managed and cannot be deleted by users'
      )
    })
  })

  describe('.deleteSystemVolumeMappingEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const mappingUuid = 'vol-uuid'
    const microservice = buildMicroserviceRecord({ uuid: msvcUuid })

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOne').resolves(microservice)
      $sandbox.stub(VolumeMappingManager, 'findOne').resolves({
        uuid: mappingUuid,
        microserviceUuid: msvcUuid,
        type: 'volume'
      })
      $sandbox.stub(VolumeMappingManager, 'delete').resolves(1)
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('deletes the mapping and marks the system microservice for rebuild', async () => {
      await $service.deleteSystemVolumeMappingEndPoint(msvcUuid, mappingUuid, isCLI, transaction)
      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
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

  describe('.listVolumeMappingsEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const microservice = buildMicroserviceRecord({ uuid: msvcUuid })
    const mappings = [{
      hostDestination: 'nodered-config',
      containerDestination: '/data',
      accessMode: 'rw',
      id: 7,
      type: 'volume',
      scope: 'shared'
    }]

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOne').resolves(microservice)
      $sandbox.stub(VolumeMappingManager, 'findAll').resolves(mappings)
    })

    it('returns stored mapping scope', async () => {
      const result = await $service.listVolumeMappingsEndPoint(msvcUuid, isCLI, transaction)
      expect(VolumeMappingManager.findAll).to.have.been.calledWith({ microserviceUuid: msvcUuid }, transaction)
      expect(result).to.eql(mappings)
      expect(result[0].scope).to.equal('shared')
    })
  })

  describe('.createMicroserviceEndPoint() catalog and registry', () => {
    const msvcUuid = 'new-msvc-uuid'
    const microserviceData = {
      name: 'new-msvc',
      application: 'my-app',
      iofogUuid: 'fog-uuid',
      images: [{ containerImage: 'demo:latest', archId: 1 }],
      registryId: 1
    }

    beforeEach(() => {
      stubCreateMicroserviceDeps($sandbox, { msvcUuid })
    })

    it('rejects a Hugging Face registry for microservice images', async () => {
      RegistryManager.findOne.resolves({ id: 3, type: 'hf' })

      return expect($service.createMicroserviceEndPoint({
        ...microserviceData,
        registryId: 3
      }, isCLI, transaction)).to.be.rejectedWith(
        AppHelper.formatMessage(ErrorMessages.REGISTRY_NOT_OCI_FOR_IMAGE, 3)
      )
    })

    it('auto-attaches catalog model names to the target agent', async () => {
      $sandbox.stub(FleetModelManager, 'findOne').resolves({ uuid: 'model-uuid', name: 'test-model' })
      const attach = $sandbox.stub(ModelService, 'ensureModelsLinkedToFog').resolves(['test-model'])

      await $service.createMicroserviceEndPoint({
        ...microserviceData,
        models: {
          bindPath: '/models',
          permissions: 'ro',
          items: [{ name: 'test-model' }]
        }
      }, isCLI, transaction)

      expect(attach).to.have.been.calledWith('fog-uuid', ['test-model'], transaction)
      expect(MicroserviceModelManager.create).to.have.been.calledWith(
        sinon.match({ bindPath: '/models', permissions: 'ro' }),
        transaction
      )
      expect(MicroserviceModelItemManager.create).to.have.been.calledWith(
        sinon.match({ name: 'test-model' }),
        transaction
      )
      const created = MicroserviceManager.create.firstCall.args[0]
      expect(created).to.not.have.property('models')
      expect(created).to.not.have.property('commands')
    })

    it('persists commands when cmd is sent as an alias', async () => {
      await $service.createMicroserviceEndPoint({
        ...microserviceData,
        cmd: ['python', 'app.py']
      }, isCLI, transaction)

      const created = MicroserviceManager.create.firstCall.args[0]
      expect(created).to.not.have.property('commands')
      expect(MicroserviceArgManager.create).to.have.been.calledWith(
        sinon.match({ cmd: 'python' }),
        transaction
      )
      expect(MicroserviceArgManager.create).to.have.been.calledWith(
        sinon.match({ cmd: 'app.py' }),
        transaction
      )
    })

    it('deploys from a template with identity overlay and merged catalog/container fields', async () => {
      $sandbox.stub(FleetModelManager, 'findOne').resolves({ uuid: 'model-uuid', name: 'test-model' })
      $sandbox.stub(ModelService, 'ensureModelsLinkedToFog').resolves(['test-model'])
      $sandbox.stub(MicroserviceTemplateService, 'getMicroserviceDataFromTemplate').resolves({
        images: [{ containerImage: 'nginx:alpine', archId: 1 }],
        registryId: 1,
        commands: ['nginx', '-g', 'daemon off;'],
        models: {
          bindPath: '/models',
          permissions: 'ro',
          items: [{ name: 'test-model' }]
        }
      })

      await $service.createMicroserviceEndPoint({
        name: 'my-instance',
        application: 'my-app',
        iofogUuid: 'fog-uuid',
        template: {
          name: 'nginx-edge',
          variables: { port: '8080' }
        }
      }, isCLI, transaction)

      expect(MicroserviceTemplateService.getMicroserviceDataFromTemplate).to.have.been.calledWith(
        { name: 'nginx-edge', variables: { port: '8080' } },
        isCLI,
        transaction
      )
      expect(Validator.validate).to.have.been.calledWith(
        sinon.match({
          name: 'my-instance',
          application: 'my-app',
          iofogUuid: 'fog-uuid',
          images: [{ containerImage: 'nginx:alpine', archId: 1 }]
        }),
        Validator.schemas.microserviceCreate
      )
      const created = MicroserviceManager.create.firstCall.args[0]
      expect(created.name).to.equal('my-instance')
      expect(created).to.not.have.property('models')
      expect(created).to.not.have.property('commands')
      expect(MicroserviceModelItemManager.create).to.have.been.calledWith(
        sinon.match({ name: 'test-model' }),
        transaction
      )
      expect(MicroserviceArgManager.create).to.have.been.calledWith(
        sinon.match({ cmd: 'nginx' }),
        transaction
      )
    })
  })

  describe('.updateMicroserviceCatalogEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const existingCatalog = {
      bindPath: '/models',
      permissions: 'ro',
      items: [{ name: 'test-model' }]
    }

    function stubCatalogPatch (sandbox, existing, previousCatalog = null) {
      sandbox.stub(MicroserviceManager, 'findOneWithCategory').resolves(existing)
      sandbox.stub(VolumeMappingManager, 'findAll').resolves([])
      sandbox.stub(FleetModelManager, 'findOne').resolves({ uuid: 'model-uuid', name: 'test-model' })
      sandbox.stub(ModelService, 'ensureModelsLinkedToFog').resolves([])
      sandbox.stub(MicroserviceManager, 'update').resolves()
      sandbox.stub(ChangeTrackingService, 'update').resolves()
      sandbox.stub(MicroserviceTmpfsManager, 'findAll').resolves([])
      sandbox.stub(MicroserviceModelManager, 'findOne').resolves(
        previousCatalog && previousCatalog.bindPath
          ? { bindPath: previousCatalog.bindPath, permissions: previousCatalog.permissions || 'ro' }
          : null
      )
      sandbox.stub(MicroserviceModelItemManager, 'findAll').resolves(
        previousCatalog && Array.isArray(previousCatalog.items)
          ? previousCatalog.items.map((item, id) => ({ id, name: item.name }))
          : []
      )
      sandbox.stub(MicroserviceModelManager, 'delete').resolves()
      sandbox.stub(MicroserviceModelManager, 'create').resolves()
      sandbox.stub(MicroserviceModelItemManager, 'delete').resolves()
      sandbox.stub(MicroserviceModelItemManager, 'create').resolves()
    }

    it('rebuilds when the catalog goes from empty to non-empty', async () => {
      const existing = buildMicroserviceRecord({ rebuild: false })
      stubCatalogPatch($sandbox, existing)

      await $service.updateMicroserviceCatalogEndPoint(msvcUuid, {
        bindPath: '/models',
        items: [{ name: 'test-model' }]
      }, isCLI, transaction)

      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        sinon.match({ rebuild: true }),
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        existing.iofogUuid,
        ChangeTrackingService.events.microserviceList,
        transaction
      )
      expect(ChangeTrackingService.update).to.not.have.been.calledWith(
        existing.iofogUuid,
        ChangeTrackingService.events.microserviceModels,
        transaction
      )
      expect(MicroserviceModelItemManager.create).to.have.been.calledWith(
        sinon.match({ name: 'test-model' }),
        transaction
      )
    })

    it('rebuilds when the catalog goes from non-empty to empty', async () => {
      const existing = buildMicroserviceRecord({ rebuild: false })
      stubCatalogPatch($sandbox, existing, existingCatalog)

      await $service.updateMicroserviceCatalogEndPoint(msvcUuid, {
        items: []
      }, isCLI, transaction)

      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        sinon.match({ rebuild: true }),
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        existing.iofogUuid,
        ChangeTrackingService.events.microserviceList,
        transaction
      )
    })

    it('rebuilds when bindPath changes', async () => {
      const existing = buildMicroserviceRecord({ rebuild: false })
      stubCatalogPatch($sandbox, existing, existingCatalog)

      await $service.updateMicroserviceCatalogEndPoint(msvcUuid, {
        bindPath: '/opt/models',
        permissions: 'ro',
        items: [{ name: 'test-model' }]
      }, isCLI, transaction)

      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        sinon.match({ rebuild: true }),
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        existing.iofogUuid,
        ChangeTrackingService.events.microserviceList,
        transaction
      )
    })

    it('rebuilds when permissions change', async () => {
      const existing = buildMicroserviceRecord({ rebuild: false })
      stubCatalogPatch($sandbox, existing, existingCatalog)

      await $service.updateMicroserviceCatalogEndPoint(msvcUuid, {
        bindPath: '/models',
        permissions: 'rw',
        items: [{ name: 'test-model' }]
      }, isCLI, transaction)

      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        sinon.match({ rebuild: true }),
        transaction
      )
    })

    it('does not rebuild when only items change on a non-empty catalog', async () => {
      const existing = buildMicroserviceRecord({ rebuild: false })
      stubCatalogPatch($sandbox, existing, existingCatalog)
      FleetModelManager.findOne.callsFake(async (where) => ({ uuid: 'model-uuid', name: where.name }))

      await $service.updateMicroserviceCatalogEndPoint(msvcUuid, {
        bindPath: '/models',
        permissions: 'ro',
        items: [{ name: 'test-model' }, { name: 'qwen3-8-27b' }]
      }, isCLI, transaction)

      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        sinon.match({ rebuild: false }),
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledOnceWith(
        existing.iofogUuid,
        ChangeTrackingService.events.microserviceModels,
        transaction
      )
    })
  })

  describe('.buildGetMicroserviceResponse() observed status', () => {
    def('subject', () => $service.buildGetMicroserviceResponse($microservice, transaction))
    def('microservice', () => ({
      uuid: 'msvc-uuid',
      name: 'test-msvc',
      applicationId: 42,
      logSize: 1024
    }))

    beforeEach(() => {
      stubBuildGetResponseDeps($sandbox)
      $sandbox.stub(ApplicationManager, 'findOne').resolves({ name: 'my-app' })
    })

    it('zeros CPU when status is STOPPED', async () => {
      MicroserviceStatusManager.findAllExcludeFields.resolves([{
        status: 'STOPPED',
        cpuUsage: 12.5,
        memoryUsage: 64,
        startTime: 9,
        operatingDuration: 10,
        containerId: 'ctr-keep'
      }])

      const result = await $subject
      expect(result.status).to.include({
        status: 'STOPPED',
        cpuUsage: 0,
        memoryUsage: 0,
        startTime: 0,
        operatingDuration: 0,
        containerId: 'ctr-keep'
      })
    })

    it('zeros CPU when status is STOPPING', async () => {
      MicroserviceStatusManager.findAllExcludeFields.resolves([{
        status: 'STOPPING',
        cpuUsage: 12.5,
        memoryUsage: 64,
        startTime: 9,
        operatingDuration: 10,
        containerId: 'ctr-keep'
      }])

      const result = await $subject
      expect(result.status).to.include({
        status: 'STOPPING',
        cpuUsage: 0,
        memoryUsage: 0,
        startTime: 0,
        operatingDuration: 0,
        containerId: 'ctr-keep'
      })
    })

    it('keeps RUNNING meters', async () => {
      MicroserviceStatusManager.findAllExcludeFields.resolves([{
        status: 'RUNNING',
        cpuUsage: 12.5,
        memoryUsage: 64,
        startTime: 9,
        operatingDuration: 10
      }])

      const result = await $subject
      expect(result.status).to.include({
        status: 'RUNNING',
        cpuUsage: 12.5,
        memoryUsage: 64
      })
    })

    it('returns lastError, lastErrorAt, and restartCount on GET', async () => {
      MicroserviceStatusManager.findAllExcludeFields.resolves([{
        status: 'RUNNING',
        cpuUsage: 1,
        errorMessage: '',
        lastError: 'exitCode=1 oomKilled=false',
        lastErrorAt: 1726660000123,
        restartCount: 4
      }])

      const result = await $subject
      expect(result.status).to.include({
        errorMessage: '',
        lastError: 'exitCode=1 oomKilled=false',
        lastErrorAt: 1726660000123,
        restartCount: 4
      })
    })

    it('returns empty last crash fields when the row has none', async () => {
      MicroserviceStatusManager.findAllExcludeFields.resolves([{
        status: 'STOPPED',
        cpuUsage: 0,
        memoryUsage: 0
      }])

      const result = await $subject
      expect(result.status).to.include({
        lastError: '',
        lastErrorAt: 0,
        restartCount: 0
      })
    })
  })

  describe('.stopMicroserviceEndPoint()', () => {
    const msvcUuid = 'msvc-uuid'
    const microservice = buildMicroserviceRecord({
      uuid: msvcUuid,
      catalogItem: { category: 'USER' }
    })

    def('subject', () => $service.stopMicroserviceEndPoint(msvcUuid, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOneWithCategory').resolves(microservice)
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(MicroserviceStatusManager, 'update').resolves()
      $sandbox.stub(MicroserviceExecStatusManager, 'update').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('sets observed STOPPING with zero meters and inactive exec', async () => {
      const result = await $subject
      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: msvcUuid },
        { isActivated: false },
        transaction
      )
      expect(MicroserviceStatusManager.update).to.have.been.calledWith(
        { microserviceUuid: [msvcUuid] },
        sinon.match({
          status: 'STOPPING',
          cpuUsage: 0,
          memoryUsage: 0,
          startTime: 0,
          operatingDuration: 0
        }),
        transaction
      )
      expect(MicroserviceExecStatusManager.update).to.have.been.calledWith(
        { microserviceUuid: [msvcUuid] },
        sinon.match({ status: 'INACTIVE', execSessionId: '' }),
        transaction
      )
      expect(result).to.eql({ uuid: msvcUuid, isActivated: false })
    })
  })

  describe('.deleteNotRunningMicroservices()', () => {
    def('subject', () => $service.deleteNotRunningMicroservices({ uuid: 'fog-uuid' }, transaction))

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findAllWithStatuses')
      $sandbox.stub($service, 'deleteMicroserviceWithRoutesAndPortMappings').resolves()
    })

    it('awaits deletes for not-running flagged microservices', async () => {
      MicroserviceManager.findAllWithStatuses.resolves([
        { delete: true, microserviceStatus: { status: 'UNKNOWN' } },
        { delete: true, microserviceStatus: { status: 'STOPPING' } },
        { delete: true, microserviceStatus: { status: 'RUNNING' } },
        { delete: false, microserviceStatus: { status: 'DELETING' } },
        { delete: true, microserviceStatus: null }
      ])

      await $subject

      expect($service.deleteMicroserviceWithRoutesAndPortMappings).to.have.been.calledTwice
      expect($service.deleteMicroserviceWithRoutesAndPortMappings.firstCall).to.have.been.calledWith(
        sinon.match({ microserviceStatus: { status: 'UNKNOWN' } }),
        transaction
      )
      expect($service.deleteMicroserviceWithRoutesAndPortMappings.secondCall).to.have.been.calledWith(
        sinon.match({ microserviceStatus: { status: 'STOPPING' } }),
        transaction
      )
    })
  })
})
