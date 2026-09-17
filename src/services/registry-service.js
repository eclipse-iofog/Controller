const RegistryManager = require('../data/managers/registry-manager')
const SecretHelper = require('../helpers/secret-helper')
const {
  scheduleVaultDeleteAfterCommit,
  scheduleVaultPromoteAfterCommit
} = require('../helpers/vault-transaction-helper')
const Validator = require('../schemas')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const ReconcileOutboxManager = require('../data/managers/reconcile-outbox-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const MicroserviceManager = require('../data/managers/microservice-manager')
const AppHelper = require('../helpers/app-helper')

const REGISTRY_TYPE_OCI = 'oci'
const REGISTRY_TYPE_HF = 'hf'
const HUB_REGISTRY_URL = 'https://huggingface.co'
const HUB_REGISTRY_TYPE = REGISTRY_TYPE_HF
const LEGACY_SYSTEM_REGISTRY_IDS = new Set([1, 2])

function isPasswordEmpty (password) {
  return password == null || (typeof password === 'string' && password.trim() === '')
}

function isBlank (value) {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

function normalizeRegistryType (type) {
  if (type == null || type === '') {
    return REGISTRY_TYPE_OCI
  }
  return type
}

function isHubRegistry (registry) {
  if (!registry) {
    return false
  }
  return registry.url === HUB_REGISTRY_URL && normalizeRegistryType(registry.type) === HUB_REGISTRY_TYPE
}

function isLegacySystemRegistryId (id) {
  return LEGACY_SYSTEM_REGISTRY_IDS.has(parseInt(id, 10))
}

function toPlainRegistry (registry) {
  if (!registry) {
    return null
  }
  return typeof registry.toJSON === 'function' ? registry.toJSON() : { ...registry }
}

function toAgentRegistry (registry) {
  const plain = toPlainRegistry(registry) || {}
  return {
    id: plain.id,
    url: plain.url,
    isPublic: !!plain.isPublic,
    username: plain.username || '',
    password: plain.password || '',
    userEmail: plain.userEmail || '',
    type: normalizeRegistryType(plain.type),
    ca: plain.ca || '',
    insecure: !!plain.insecure
  }
}

function isValidBase64 (value) {
  if (value == null || value === '') {
    return true
  }
  if (typeof value !== 'string') {
    return false
  }
  const normalized = value.replace(/\s/g, '')
  if (!normalized) {
    return true
  }
  if (normalized.length % 4 !== 0) {
    return false
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    return false
  }
  try {
    Buffer.from(normalized, 'base64')
    return true
  } catch (err) {
    return false
  }
}

function normalizeCaForStorage (ca) {
  if (ca === undefined || ca === null || (typeof ca === 'string' && ca.trim() === '')) {
    return null
  }
  if (!isValidBase64(ca)) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_INVALID_CA)
  }
  return ca
}

function normalizeCaForWire (ca) {
  if (ca == null || (typeof ca === 'string' && ca.trim() === '')) {
    return null
  }
  return ca
}

function assertCredentialRules (data, existing) {
  const type = normalizeRegistryType(data.type !== undefined ? data.type : existing && existing.type)
  const isPublic = data.isPublic !== undefined ? data.isPublic : !!(existing && existing.isPublic)
  const username = data.username !== undefined ? data.username : (existing && existing.username)
  const password = data.password !== undefined ? data.password : (existing && existing.password)

  if (isPublic) {
    return
  }
  if (type === REGISTRY_TYPE_OCI) {
    if (isBlank(username) || isPasswordEmpty(password)) {
      throw new Errors.ValidationError(ErrorMessages.REGISTRY_PRIVATE_OCI_CREDENTIALS_REQUIRED)
    }
    return
  }
  if (type === REGISTRY_TYPE_HF && isPasswordEmpty(password)) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_PRIVATE_HF_TOKEN_REQUIRED)
  }
}

function assertSystemRegistryProtection (existing, patch) {
  if (isLegacySystemRegistryId(existing.id)) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }
  if (!isHubRegistry(existing)) {
    return
  }
  if (patch.url !== undefined && patch.url !== existing.url) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }
  if (patch.type !== undefined && normalizeRegistryType(patch.type) !== HUB_REGISTRY_TYPE) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }
}

function mergedRegistryIdentity (existing, patch) {
  return {
    url: patch.url !== undefined ? patch.url : existing && existing.url,
    type: normalizeRegistryType(patch.type !== undefined ? patch.type : existing && existing.type)
  }
}

const createRegistry = async function (registry, transaction) {
  await Validator.validate(registry, Validator.schemas.registryCreate)

  const type = normalizeRegistryType(registry.type)
  const ca = normalizeCaForStorage(registry.ca)
  assertCredentialRules({
    type,
    isPublic: registry.isPublic,
    username: registry.username,
    password: registry.password
  }, null)

  if (isHubRegistry({ url: registry.url, type })) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }

  let registryCreate = {
    url: registry.url,
    username: registry.username,
    password: registry.password,
    isPublic: registry.isPublic,
    userEmail: registry.email,
    type,
    ca,
    insecure: registry.insecure === true
  }

  registryCreate = AppHelper.deleteUndefinedFields(registryCreate)
  if (registryCreate.type === undefined) {
    registryCreate.type = REGISTRY_TYPE_OCI
  }
  if (registryCreate.insecure === undefined) {
    registryCreate.insecure = false
  }

  const createdRegistry = await RegistryManager.create(registryCreate, transaction)

  if (!isPasswordEmpty(registryCreate.password)) {
    const secretName = 'registry-' + createdRegistry.id
    const secretData = { value: registryCreate.password }
    const internalEncrypted = await SecretHelper.encryptSecretInternal(secretData, secretName)
    await RegistryManager.update(
      { id: createdRegistry.id },
      { password: internalEncrypted },
      transaction
    )
    scheduleVaultPromoteAfterCommit(transaction, {
      secretData,
      secretName,
      secretType: 'registry',
      model: () => require('../data/models').Registry,
      where: { id: createdRegistry.id },
      field: 'password'
    })
  }

  await ReconcileOutboxManager.enqueueAgentPropagation({
    scope: 'registry',
    reason: 'created',
    actions: ['notify_registries']
  }, transaction)

  return {
    id: createdRegistry.id
  }
}

const findRegistries = async function (isCLI, transaction) {
  const queryRegistry = isCLI
    ? {}
    : {}

  const registries = await RegistryManager.findAllWithAttributes(queryRegistry, { exclude: ['password'] }, transaction)
  return {
    registries: registries.map((registry) => {
      const plain = toPlainRegistry(registry)
      return {
        ...plain,
        type: normalizeRegistryType(plain.type),
        ca: normalizeCaForWire(plain.ca),
        insecure: !!plain.insecure
      }
    })
  }
}

const deleteRegistry = async function (registryData, isCLI, transaction) {
  await Validator.validate(registryData, Validator.schemas.registryDelete)
  const queryData = isCLI
    ? { id: registryData.id }
    : { id: registryData.id }
  const id = parseInt(registryData.id, 10)
  if (isLegacySystemRegistryId(id)) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }
  const registry = await RegistryManager.findOne(queryData, transaction)
  if (!registry) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, registryData.id))
  }
  if (isHubRegistry(registry)) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }
  const microservices = await MicroserviceManager.findAllWithStatuses({ registryId: registryData.id }, transaction)
  if (microservices.length > 0) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_IN_USE)
  } else {
    await RegistryManager.delete(queryData, transaction)
    await ReconcileOutboxManager.enqueueAgentPropagation({
      scope: 'registry',
      reason: 'deleted',
      actions: ['notify_registries']
    }, transaction)
  }
}

const updateRegistry = async function (registry, registryId, isCLI, transaction) {
  await Validator.validate(registry, Validator.schemas.registryUpdate)
  const id = parseInt(registryId, 10)
  if (isLegacySystemRegistryId(id)) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }
  const existingRegistry = await RegistryManager.findOne({
    id: registryId
  }, transaction)

  if (!existingRegistry) {
    throw new Errors.NotFoundError(ErrorMessages.REGISTRY_NOT_FOUND)
  }

  assertSystemRegistryProtection(existingRegistry, registry)

  const mergedIdentity = mergedRegistryIdentity(existingRegistry, registry)
  if (!isHubRegistry(existingRegistry) && isHubRegistry(mergedIdentity)) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }

  assertCredentialRules(registry, existingRegistry)

  let registryUpdate = {
    url: registry.url,
    username: registry.username,
    password: registry.password,
    isPublic: registry.isPublic,
    userEmail: registry.email,
    type: registry.type,
    ca: registry.ca !== undefined ? normalizeCaForStorage(registry.ca) : undefined,
    insecure: registry.insecure
  }

  registryUpdate = AppHelper.deleteUndefinedFields(registryUpdate)

  if (registryUpdate.password !== undefined && isPasswordEmpty(registryUpdate.password) && SecretHelper.isVaultReference(existingRegistry.password)) {
    scheduleVaultDeleteAfterCommit(transaction, 'registry-' + existingRegistry.id, 'registry')
  }

  const where = isCLI
    ? {
        id: registryId
      }
    : {
        id: registryId
      }

  await RegistryManager.update(where, registryUpdate, transaction)

  await ReconcileOutboxManager.enqueueAgentPropagation({
    scope: 'registry',
    reason: 'updated',
    registryId: parseInt(registryId, 10),
    actions: ['rebuild', 'notify_microservices']
  }, transaction)

  await ReconcileOutboxManager.enqueueAgentPropagation({
    scope: 'registry',
    reason: 'updated',
    actions: ['notify_registries']
  }, transaction)
}

const getRegistry = async function (registryId, isCLI, transaction) {
  const id = parseInt(registryId, 10)
  const registry = await RegistryManager.findOne({ id }, transaction)
  if (!registry) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, registryId))
  }
  const plain = toPlainRegistry(registry)
  return {
    ...plain,
    type: normalizeRegistryType(plain.type),
    ca: normalizeCaForWire(plain.ca),
    insecure: !!plain.insecure
  }
}

const assertOciRegistryForImage = async function (registryId, transaction) {
  const id = parseInt(registryId, 10)
  const registry = Number.isFinite(id) ? await RegistryManager.findOne({ id }, transaction) : null
  if (!registry || normalizeRegistryType(registry.type) !== REGISTRY_TYPE_OCI) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REGISTRY_NOT_OCI_FOR_IMAGE, registryId))
  }
  return registry
}

module.exports = {
  createRegistry: TransactionDecorator.generateTransaction(createRegistry),
  findRegistries: TransactionDecorator.generateTransaction(findRegistries),
  deleteRegistry: TransactionDecorator.generateTransaction(deleteRegistry),
  updateRegistry: TransactionDecorator.generateTransaction(updateRegistry),
  getRegistry: TransactionDecorator.generateTransaction(getRegistry),
  assertOciRegistryForImage: TransactionDecorator.generateTransaction(assertOciRegistryForImage),
  toAgentRegistry
}
