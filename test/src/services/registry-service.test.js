const { expect } = require('chai')
const sinon = require('sinon')

const RegistryManager = require('../../../src/data/managers/registry-manager')
const RegistryService = require('../../../src/services/registry-service')
const Validator = require('../../../src/schemas')
const ReconcileOutboxManager = require('../../../src/data/managers/reconcile-outbox-manager')
const AppHelper = require('../../../src/helpers/app-helper')
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
    type: 'oci',
    ca: null,
    insecure: false,
    ...fields
  }
}

function stubAgentPropagation (sandbox) {
  sandbox.stub(ReconcileOutboxManager, 'enqueueAgentPropagation').resolves()
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
      stubAgentPropagation($sandbox)
    })

    it('validates input, encrypts password internally in tx, enqueues propagation, and returns registry id', async () => {
      const result = await $subject
      expect(Validator.validate).to.have.been.calledWith(registryData, Validator.schemas.registryCreate)
      expect(RegistryManager.create).to.have.been.calledWithMatch({
        url: registryData.url,
        username: registryData.username,
        userEmail: registryData.email,
        type: 'oci',
        ca: null,
        insecure: false
      }, transaction)
      expect(SecretHelper.encryptSecretInternal).to.have.been.calledWith(
        { value: registryData.password },
        'registry-16'
      )
      expect(SecretHelper.encryptSecret).to.not.have.been.called
      expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledOnceWith({
        scope: 'registry',
        reason: 'created',
        actions: ['notify_registries']
      }, transaction)
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

    it('rejects private OCI registries without username and password', () => {
      return expect($service.createRegistry({
        url: 'https://registry.example.com',
        isPublic: false,
        type: 'oci'
      }, transaction)).to.be.rejectedWith(ErrorMessages.REGISTRY_PRIVATE_OCI_CREDENTIALS_REQUIRED)
    })

    it('creates a private Hugging Face registry with a token', async () => {
      const hfRegistry = {
        url: 'https://hf.example.com',
        isPublic: false,
        type: 'hf',
        password: 'hf_token'
      }
      RegistryManager.create.resolves(buildRegistryRecord({
        id: 18,
        url: hfRegistry.url,
        type: 'hf',
        password: hfRegistry.password,
        isPublic: false,
        username: ''
      }))

      const result = await $service.createRegistry(hfRegistry, transaction)

      expect(RegistryManager.create).to.have.been.calledWithMatch({
        url: hfRegistry.url,
        type: 'hf',
        password: hfRegistry.password,
        insecure: false
      }, transaction)
      expect(result).to.eql({ id: 18 })
    })

    it('rejects creating a second Hub registry', () => {
      return expect($service.createRegistry({
        url: 'https://huggingface.co',
        isPublic: true,
        type: 'hf'
      }, transaction)).to.be.rejectedWith(ErrorMessages.REGISTRY_IS_SYSTEM)
    })

    it('rejects an invalid CA bundle', () => {
      return expect($service.createRegistry({
        url: 'https://registry.example.com',
        isPublic: true,
        ca: 'not-valid-base64!!!'
      }, transaction)).to.be.rejectedWith(ErrorMessages.REGISTRY_INVALID_CA)
    })

    it('stores empty ca as null', async () => {
      await $service.createRegistry({
        url: 'https://registry.example.com',
        isPublic: true,
        ca: ''
      }, transaction)
      expect(RegistryManager.create).to.have.been.calledWithMatch({ ca: null }, transaction)
    })

    it('stores a valid base64 ca bundle', async () => {
      await $service.createRegistry({
        url: 'https://registry.example.com',
        isPublic: true,
        ca: 'Y2VydA=='
      }, transaction)
      expect(RegistryManager.create).to.have.been.calledWithMatch({ ca: 'Y2VydA==' }, transaction)
    })
  })

  describe('.findRegistries()', () => {
    const registries = [buildRegistryRecord()]

    def('subject', () => $service.findRegistries(isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(RegistryManager, 'findAllWithAttributes').resolves(registries)
    })

    it('returns registries without password field and with type, ca, and insecure defaults', async () => {
      const result = await $subject
      expect(RegistryManager.findAllWithAttributes).to.have.been.calledWith(
        {},
        { exclude: ['password'] },
        transaction
      )
      expect(result.registries).to.eql([{
        id: 16,
        url: 'https://registry.example.com',
        username: 'user',
        password: 'encrypted-secret',
        isPublic: false,
        userEmail: 'user@example.com',
        type: 'oci',
        ca: null,
        insecure: false
      }])
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
      stubAgentPropagation($sandbox)
    })

    it('deletes an unused registry and enqueues propagation', async () => {
      await $subject
      expect(RegistryManager.delete).to.have.been.calledWith({ id: registryId }, transaction)
      expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledOnceWith({
        scope: 'registry',
        reason: 'deleted',
        actions: ['notify_registries']
      }, transaction)
    })

    it('rejects system registry ids', () => {
      return expect($service.deleteRegistry({ id: 1 }, isCLI, transaction))
        .to.be.rejectedWith(ErrorMessages.REGISTRY_IS_SYSTEM)
    })

    it('rejects the Hub registry by url and type regardless of id', () => {
      RegistryManager.findOne.resolves(buildRegistryRecord({
        id: 9,
        url: 'https://huggingface.co',
        type: 'hf',
        isPublic: true,
        username: '',
        password: ''
      }))
      return expect($service.deleteRegistry({ id: 9 }, isCLI, transaction))
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
      stubAgentPropagation($sandbox)
    })

    it('updates registry metadata and enqueues global registries propagation', async () => {
      await $subject
      expect(RegistryManager.update).to.have.been.calledWith(
        { id: registryId },
        sinon.match({ url: updateData.url, username: updateData.username }),
        transaction
      )
      expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledTwice
      expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledWith({
        scope: 'registry',
        reason: 'updated',
        registryId,
        actions: ['rebuild', 'notify_microservices']
      }, transaction)
      expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledWith({
        scope: 'registry',
        reason: 'updated',
        actions: ['notify_registries']
      }, transaction)
    })

    it('rejects system registry ids', () => {
      return expect($service.updateRegistry(updateData, 2, isCLI, transaction))
        .to.be.rejectedWith(ErrorMessages.REGISTRY_IS_SYSTEM)
    })

    it('rejects Hub url or type changes that would break identity', async () => {
      RegistryManager.findOne.resolves(buildRegistryRecord({
        id: 9,
        url: 'https://huggingface.co',
        type: 'hf',
        isPublic: true
      }))
      await expect($service.updateRegistry({ url: 'https://example.com' }, 9, isCLI, transaction))
        .to.be.rejectedWith(ErrorMessages.REGISTRY_IS_SYSTEM)
      await expect($service.updateRegistry({ type: 'oci' }, 9, isCLI, transaction))
        .to.be.rejectedWith(ErrorMessages.REGISTRY_IS_SYSTEM)
    })

    it('clears ca to null when an empty string is provided', async () => {
      await $service.updateRegistry({ ca: '' }, registryId, isCLI, transaction)
      expect(RegistryManager.update).to.have.been.calledWith(
        { id: registryId },
        sinon.match({ ca: null }),
        transaction
      )
    })

    it('allows Hub token updates without changing identity fields', async () => {
      RegistryManager.findOne.resolves(buildRegistryRecord({
        id: 9,
        url: 'https://huggingface.co',
        type: 'hf',
        isPublic: true,
        password: ''
      }))
      await $service.updateRegistry({ password: 'hf_token' }, 9, isCLI, transaction)
      expect(RegistryManager.update).to.have.been.calledWith(
        { id: 9 },
        sinon.match({ password: 'hf_token' }),
        transaction
      )
    })

    context('when registry is missing', () => {
      beforeEach(() => {
        RegistryManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(ErrorMessages.REGISTRY_NOT_FOUND))
    })

    context('when microservices use the registry', () => {
      beforeEach(() => {
        $sandbox.stub(MicroserviceManager, 'updateAndFind').resolves()
      })

      it('enqueues two outbox rows without sync microservice fan-out', async () => {
        await $subject
        expect(MicroserviceManager.updateAndFind).to.not.have.been.called
        expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledTwice
        expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledWith({
          scope: 'registry',
          reason: 'updated',
          registryId,
          actions: ['rebuild', 'notify_microservices']
        }, transaction)
        expect(ReconcileOutboxManager.enqueueAgentPropagation).to.have.been.calledWith({
          scope: 'registry',
          reason: 'updated',
          actions: ['notify_registries']
        }, transaction)
      })
    })

    context('when password is cleared and vault reference exists', () => {
      beforeEach(() => {
        $sandbox.stub(vaultManager, 'isEnabled').returns(true)
        RegistryManager.findOne.resolves({ ...existing, password: 'vault:ref', isPublic: true })
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

    it('returns the registry record with type, ca, and insecure', async () => {
      const result = await $subject
      expect(RegistryManager.findOne).to.have.been.calledWith({ id: registryId }, transaction)
      expect(result).to.include({
        id: registryId,
        type: 'oci',
        ca: null,
        insecure: false
      })
    })

    context('when registry is missing', () => {
      beforeEach(() => {
        RegistryManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })

  describe('.assertOciRegistryForImage()', () => {
    beforeEach(() => {
      $sandbox.stub(RegistryManager, 'findOne')
    })

    it('accepts an OCI registry', async () => {
      RegistryManager.findOne.resolves(buildRegistryRecord({ id: 4, type: 'oci' }))
      const registry = await $service.assertOciRegistryForImage(4, transaction)
      expect(registry.type).to.equal('oci')
    })

    it('rejects a Hugging Face registry id', () => {
      RegistryManager.findOne.resolves(buildRegistryRecord({
        id: 3,
        url: 'https://huggingface.co',
        type: 'hf'
      }))
      return expect($service.assertOciRegistryForImage(3, transaction))
        .to.be.rejectedWith(AppHelper.formatMessage(ErrorMessages.REGISTRY_NOT_OCI_FOR_IMAGE, 3))
    })

    it('rejects a missing registry', () => {
      RegistryManager.findOne.resolves(null)
      return expect($service.assertOciRegistryForImage(99, transaction))
        .to.be.rejectedWith(AppHelper.formatMessage(ErrorMessages.REGISTRY_NOT_OCI_FOR_IMAGE, 99))
    })
  })
})
