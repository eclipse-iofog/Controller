const { expect } = require('chai')
const sinon = require('sinon')

const ControllerMsService = require('../../../src/services/controller-ms-service')
const Validator = require('../../../src/schemas')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const MicroserviceStatusManager = require('../../../src/data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../../../src/data/managers/microservice-exec-status-manager')
const CatalogItemImageManager = require('../../../src/data/managers/catalog-item-image-manager')
const MicroserviceEnvManager = require('../../../src/data/managers/microservice-env-manager')
const RegistryManager = require('../../../src/data/managers/registry-manager')
const VolumeMappingManager = require('../../../src/data/managers/volume-mapping-manager')
const MicroservicesService = require('../../../src/services/microservices-service')
const MicroservicePortService = require('../../../src/services/microservice-ports/microservice-port')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const Errors = require('../../../src/helpers/errors')

describe('Controller MS Service', () => {
  def('subject', () => ControllerMsService)
  def('sandbox', () => sinon.createSandbox())

  const transaction = {}

  const fogUuid = 'system-fog-uuid'
  const msUuid = 'controller-ms-uuid'

  const systemFog = {
    uuid: fogUuid,
    name: 'system-fog',
    isSystem: true,
    archId: 1,
    availableRuntimes: JSON.stringify(['io.containerd.runc.v2'])
  }

  const nonSystemFog = {
    uuid: 'regular-fog-uuid',
    name: 'regular-fog',
    isSystem: false,
    archId: 1
  }

  const application = {
    id: 99,
    name: 'system-system-fog',
    isSystem: true
  }

  const registerData = {
    uuid: msUuid,
    images: [{ containerImage: 'controller:latest', archId: 1 }],
    registryId: 1,
    ports: [{ internal: 8080, external: 8080, protocol: 'tcp' }],
    volumeMappings: [{
      hostDestination: '/data',
      containerDestination: '/data',
      accessMode: 'rw',
      type: 'bind'
    }],
    env: [{ key: 'CONTROL_PLANE', value: 'Remote' }],
    config: '{}',
    hostNetworkMode: false,
    runtime: 'io.containerd.runc.v2'
  }

  afterEach(() => $sandbox.restore())

  describe('.registerControllerMicroservice()', () => {
    def('fog', () => systemFog)
    def('body', () => ({ ...registerData }))
    def('subject', () => $subject.registerControllerMicroservice($body, $fog, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(RegistryManager, 'findOne').resolves({ id: 1 })
      $sandbox.stub(ApplicationManager, 'findOne').resolves(application)
      $sandbox.stub(MicroserviceManager, 'findOne').callsFake((where) => {
        if (where.uuid === msUuid) {
          return Promise.resolve(null)
        }
        return Promise.resolve(null)
      })
      $sandbox.stub(MicroserviceManager, 'delete').resolves()
      $sandbox.stub(MicroserviceManager, 'create').resolves({ uuid: msUuid, name: 'controller' })
      $sandbox.stub(MicroserviceManager, 'updateAndFind').resolves({ uuid: msUuid, name: 'controller' })
      $sandbox.stub(CatalogItemImageManager, 'bulkCreate').resolves()
      $sandbox.stub(CatalogItemImageManager, 'findAll').resolves([])
      $sandbox.stub(CatalogItemImageManager, 'delete').resolves()
      $sandbox.stub(MicroservicePortService, 'validatePortMappings').resolves()
      $sandbox.stub(MicroservicePortService, 'createPortMapping').resolves()
      $sandbox.stub(MicroservicePortService, 'deletePortMappings').resolves()
      $sandbox.stub(MicroserviceEnvManager, 'create').resolves()
      $sandbox.stub(MicroserviceEnvManager, 'delete').resolves()
      $sandbox.stub(VolumeMappingManager, 'bulkCreate').resolves()
      $sandbox.stub(VolumeMappingManager, 'delete').resolves()
      $sandbox.stub(MicroserviceStatusManager, 'create').resolves()
      $sandbox.stub(MicroserviceExecStatusManager, 'create').resolves()
      $sandbox.stub(MicroservicesService, 'updateChangeTracking').resolves()
      $sandbox.stub(MicroservicesService, 'injectServiceAccountVolume').resolves()
      $sandbox.stub(MicroservicesService, 'createOrUpdateServiceAccountForMicroservice').resolves()
    })

    context('on non-system fog', () => {
      def('fog', () => nonSystemFog)

      it('rejects with ForbiddenError', async () => {
        await expect($subject).to.be.rejectedWith(Errors.ForbiddenError)
      })
    })

    it('returns uuid only on create', async () => {
      const result = await $subject
      expect(result).to.deep.equal({ uuid: msUuid })
    })

    it('creates microservice with client uuid and isController true', async () => {
      await $subject
      expect(MicroserviceManager.create).to.have.been.calledWith(
        sinon.match({
          uuid: msUuid,
          name: 'controller',
          iofogUuid: fogUuid,
          applicationId: application.id,
          isController: true,
          schedule: 0,
          registryId: 1
        }),
        transaction
      )
    })

    it('accepts optional schedule 0 in register body', async () => {
      def('body', () => ({ ...registerData, schedule: 0 }))
      await expect($subject).to.be.fulfilled
    })

    it('defaults name to controller when omitted', async () => {
      def('body', () => {
        const { name, ...rest } = registerData
        return rest
      })
      await $subject
      expect(MicroserviceManager.create).to.have.been.calledWith(
        sinon.match({ name: 'controller' }),
        transaction
      )
    })

    it('uses microserviceList change tracking on create', async () => {
      await $subject
      expect(MicroservicesService.updateChangeTracking).to.have.been.calledWith(false, fogUuid, transaction)
    })

    it('does not inject service account volume on create', async () => {
      await $subject
      expect(MicroservicesService.injectServiceAccountVolume).to.not.have.been.called
      expect(MicroservicesService.createOrUpdateServiceAccountForMicroservice).to.not.have.been.called
    })

    context('when microservice already exists', () => {
      const existing = {
        uuid: msUuid,
        name: 'controller',
        iofogUuid: fogUuid,
        applicationId: application.id,
        hostNetworkMode: false,
        runtime: 'io.containerd.runc.v2',
        config: '{}',
        registryId: 1
      }

      beforeEach(() => {
        MicroserviceManager.findOne.callsFake((where) => {
          if (where.uuid === msUuid) {
            return Promise.resolve(existing)
          }
          return Promise.resolve(null)
        })
        CatalogItemImageManager.findAll.resolves([{
          containerImage: 'controller:old',
          archId: 1
        }])
      })

      it('upserts existing microservice and returns uuid', async () => {
        const result = await $subject
        expect(result).to.deep.equal({ uuid: msUuid })
        expect(MicroserviceManager.updateAndFind).to.have.been.called
      })

      it('preserves isController on update', async () => {
        await $subject
        expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(
          { uuid: msUuid },
          sinon.match({ isController: true }),
          transaction
        )
      })

      it('forces schedule to 0 on update', async () => {
        await $subject
        expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(
          { uuid: msUuid },
          sinon.match({ schedule: 0 }),
          transaction
        )
      })

      it('rebuilds when existing schedule is not 0', async () => {
        MicroserviceManager.findOne.callsFake((where) => {
          if (where.uuid === msUuid) {
            return Promise.resolve({
              ...existing,
              schedule: 3
            })
          }
          return Promise.resolve(null)
        })
        await $subject
        expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(
          { uuid: msUuid },
          sinon.match({ schedule: 0, rebuild: true }),
          transaction
        )
      })

      it('uses microserviceCommon change tracking on update', async () => {
        await $subject
        expect(MicroservicesService.updateChangeTracking).to.have.been.calledWith(true, fogUuid, transaction)
      })

      it('rejects uuid registered on a different fog', async () => {
        MicroserviceManager.findOne.callsFake((where) => {
          if (where.uuid === msUuid) {
            return Promise.resolve({
              ...existing,
              iofogUuid: 'other-fog-uuid'
            })
          }
          return Promise.resolve(null)
        })
        await expect($subject).to.be.rejectedWith(Errors.ValidationError)
      })
    })

    context('when runtime is not available on fog', () => {
      def('body', () => ({
        ...registerData,
        runtime: 'missing-runtime'
      }))

      it('rejects with ValidationError', async () => {
        await expect($subject).to.be.rejectedWith(Errors.ValidationError)
      })
    })

    context('when name is invalid', () => {
      beforeEach(() => {
        Validator.validate.restore()
        $sandbox.stub(Validator, 'validate').rejects(new Errors.ValidationError('Invalid name'))
      })

      it('rejects with ValidationError', async () => {
        await expect($subject).to.be.rejectedWith(Errors.ValidationError)
      })
    })
  })
})
