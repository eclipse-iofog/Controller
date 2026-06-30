const { expect } = require('chai')
const sinon = require('sinon')

const RegistryManager = require('../../../src/data/managers/registry-manager')
const RegistryService = require('../../../src/services/registry-service')
const Validator = require('../../../src/schemas')
const AppHelper = require('../../../src/helpers/app-helper')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const SecretHelper = require('../../../src/helpers/secret-helper')
const vaultManager = require('../../../src/vault/vault-manager')
const ErrorMessages = require('../../../src/helpers/error-messages')
const Errors = require('../../../src/helpers/errors')

const transaction = {}
const isCLI = true

function buildRegistryRecord (fields = {}) {
  return {
    id: 16,
    url: 'https://registry.example.com',
    username: 'user',
    password: 'encrypted-secret',
    isPublic: false,
    userEmail: 'user@example.com',
    ...fields
  }
}

function stubChangeTrackingDeps (sandbox, { fogUuid = 'fog-uuid' } = {}) {
  sandbox.stub(FogManager, 'findAll').resolves([{ uuid: fogUuid }])
  sandbox.stub(ChangeTrackingService, 'update').resolves()
}

describe('Registry Service', () => {
  def('service', () => RegistryService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.createRegistry()', () => {
    const registryData = {
      url: 'https://registry.example.com',
      username: 'user',
      password: 'plain-password',
      isPublic: false,
      email: 'user@example.com'
    }
    const created = buildRegistryRecord({ id: 16, password: 'plain-password' })

    def('subject', () => $service.createRegistry(registryData, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
      $sandbox.stub(RegistryManager, 'create').resolves(created)
      $sandbox.stub(SecretHelper, 'encryptSecretInternal').resolves('encrypted-password')
      $sandbox.stub(SecretHelper, 'encryptSecret').resolves('vault-ref')
      $sandbox.stub(RegistryManager, 'update').resolves()
      stubChangeTrackingDeps($sandbox)
    })

    it('validates input, encrypts password internally in tx, and returns registry id', async () => {
      const result = await $subject
      expect(Validator.validate).to.have.been.calledWith(registryData, Validator.schemas.registryCreate)
      expect(RegistryManager.create).to.have.been.calledWithMatch({
        url: registryData.url,
        username: registryData.username,
        userEmail: registryData.email
      }, transaction)
      expect(SecretHelper.encryptSecretInternal).to.have.been.calledWith(
        { value: registryData.password },
        'registry-16'
      )
      expect(SecretHelper.encryptSecret).to.not.have.been.called
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        'fog-uuid',
        ChangeTrackingService.events.registries,
        transaction
      )
      expect(result).to.eql({ id: 16 })
    })

    context('when password is empty', () => {
      def('registryData', () => ({
        url: 'https://registry.example.com',
        username: 'user',
        password: '',
        isPublic: true
      }))
      def('subject', () => $service.createRegistry($registryData, transaction))

      beforeEach(() => {
        RegistryManager.create.resolves(buildRegistryRecord({ id: 17, password: '' }))
      })

      it('skips password encryption', async () => {
        await $subject
        expect(SecretHelper.encryptSecretInternal).to.not.have.been.called
        expect(SecretHelper.encryptSecret).to.not.have.been.called
        expect(RegistryManager.update).to.not.have.been.called
      })
    })
  })

  describe('.findRegistries()', () => {
    const registries = [buildRegistryRecord()]

    def('subject', () => $service.findRegistries(isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(RegistryManager, 'findAllWithAttributes').resolves(registries)
    })

    it('returns registries without password field', async () => {
      const result = await $subject
      expect(RegistryManager.findAllWithAttributes).to.have.been.calledWith(
        {},
        { exclude: ['password'] },
        transaction
      )
      expect(result.registries).to.equal(registries)
    })
  })

  describe('.deleteRegistry()', () => {
    const registryId = 16
    const registry = buildRegistryRecord({ id: registryId })

    def('subject', () => $service.deleteRegistry({ id: registryId }, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(RegistryManager, 'findOne').resolves(registry)
      $sandbox.stub(MicroserviceManager, 'findAllWithStatuses').resolves([])
      $sandbox.stub(RegistryManager, 'delete').resolves()
      stubChangeTrackingDeps($sandbox)
    })

    it('deletes an unused registry', async () => {
      await $subject
      expect(RegistryManager.delete).to.have.been.calledWith({ id: registryId }, transaction)
      expect(ChangeTrackingService.update).to.have.been.called
    })

    it('rejects system registry ids', () => {
      return expect($service.deleteRegistry({ id: 1 }, isCLI, transaction))
        .to.be.rejectedWith(ErrorMessages.REGISTRY_IS_SYSTEM)
    })

    context('when registry is missing', () => {
      beforeEach(() => {
        RegistryManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })

    context('when registry is in use', () => {
      beforeEach(() => {
        MicroserviceManager.findAllWithStatuses.resolves([{ uuid: 'msvc-uuid' }])
      })

      it('rejects with ValidationError', () => expect($subject).to.be.rejectedWith(ErrorMessages.REGISTRY_IS_IN_USE))
    })
  })

  describe('.updateRegistry()', () => {
    const registryId = 16
    const existing = buildRegistryRecord({ id: registryId })
    const updateData = { url: 'https://new-registry.example.com', username: 'new-user' }

    def('subject', () => $service.updateRegistry(updateData, registryId, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(RegistryManager, 'findOne').resolves(existing)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
      $sandbox.stub(RegistryManager, 'update').resolves()
      $sandbox.stub(MicroserviceManager, 'findAllWithStatuses').resolves([])
      stubChangeTrackingDeps($sandbox)
    })

    it('updates registry metadata', async () => {
      await $subject
      expect(RegistryManager.update).to.have.been.calledWith(
        { id: registryId },
        sinon.match({ url: updateData.url, username: updateData.username }),
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        'fog-uuid',
        ChangeTrackingService.events.registries,
        transaction
      )
    })

    it('rejects system registry ids', () => {
      return expect($service.updateRegistry(updateData, 2, isCLI, transaction))
        .to.be.rejectedWith(ErrorMessages.REGISTRY_IS_SYSTEM)
    })

    context('when registry is missing', () => {
      beforeEach(() => {
        RegistryManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(ErrorMessages.REGISTRY_NOT_FOUND))
    })

    context('when microservices use the registry', () => {
      const microservice = { uuid: 'msvc-uuid', iofogUuid: 'fog-uuid' }

      beforeEach(() => {
        MicroserviceManager.findAllWithStatuses.resolves([microservice])
        $sandbox.stub(MicroserviceManager, 'updateAndFind').resolves(microservice)
      })

      it('marks microservices for rebuild and updates change tracking', async () => {
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

    context('when password is cleared and vault reference exists', () => {
      beforeEach(() => {
        $sandbox.stub(vaultManager, 'isEnabled').returns(true)
        RegistryManager.findOne.resolves({ ...existing, password: 'vault:ref' })
        $sandbox.stub(SecretHelper, 'isVaultReference').returns(true)
        $sandbox.stub(SecretHelper, 'deleteSecret').resolves()
      })

      def('updateData', () => ({ password: '' }))
      def('subject', () => $service.updateRegistry($updateData, registryId, isCLI, transaction))

      it('deletes the stored secret', async () => {
        await $subject
        expect(SecretHelper.deleteSecret).to.have.been.calledWith('registry-16', 'registry')
      })
    })
  })

  describe('.getRegistry()', () => {
    const registryId = 16
    const registry = buildRegistryRecord({ id: registryId })

    def('subject', () => $service.getRegistry(registryId, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(RegistryManager, 'findOne').resolves(registry)
    })

    it('returns the registry record', async () => {
      const result = await $subject
      expect(RegistryManager.findOne).to.have.been.calledWith({ id: registryId }, transaction)
      expect(result).to.equal(registry)
    })

    context('when registry is missing', () => {
      beforeEach(() => {
        RegistryManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })
})
