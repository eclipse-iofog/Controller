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
// const Sequelize = require('sequelize')
// const Op = Sequelize.Op
const AppHelper = require('../helpers/app-helper')

function isPasswordEmpty (password) {
  return password == null || (typeof password === 'string' && password.trim() === '')
}

const createRegistry = async function (registry, transaction) {
  await Validator.validate(registry, Validator.schemas.registryCreate)

  let registryCreate = {
    url: registry.url,
    username: registry.username,
    password: registry.password,
    isPublic: registry.isPublic,
    userEmail: registry.email
  }

  registryCreate = AppHelper.deleteUndefinedFields(registryCreate)

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
    registries
  }
}

const deleteRegistry = async function (registryData, isCLI, transaction) {
  await Validator.validate(registryData, Validator.schemas.registryDelete)
  const queryData = isCLI
    ? { id: registryData.id }
    : { id: registryData.id }
  // Convert registryId to number to handle string IDs from URL parameters
  const id = parseInt(registryData.id, 10)
  if (id === 1 || id === 2) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }
  const registry = await RegistryManager.findOne(queryData, transaction)
  if (!registry) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, registryData.id))
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
  // Convert registryId to number to handle string IDs from URL parameters
  const id = parseInt(registryId, 10)
  if (id === 1 || id === 2) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }
  const existingRegistry = await RegistryManager.findOne({
    id: registryId
  }, transaction)

  if (!existingRegistry) {
    throw new Errors.NotFoundError(ErrorMessages.REGISTRY_NOT_FOUND)
  }

  let registryUpdate = {
    url: registry.url,
    username: registry.username,
    password: registry.password,
    isPublic: registry.isPublic,
    userEmail: registry.email
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
  return registry
}

module.exports = {
  createRegistry: TransactionDecorator.generateTransaction(createRegistry),
  findRegistries: TransactionDecorator.generateTransaction(findRegistries),
  deleteRegistry: TransactionDecorator.generateTransaction(deleteRegistry),
  updateRegistry: TransactionDecorator.generateTransaction(updateRegistry),
  getRegistry: TransactionDecorator.generateTransaction(getRegistry)
}
