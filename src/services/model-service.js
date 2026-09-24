const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')
const FleetModelManager = require('../data/managers/fleet-model-manager')
const RegistryManager = require('../data/managers/registry-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceModelItemManager = require('../data/managers/microservice-model-item-manager')
const FogManager = require('../data/managers/iofog-manager')
const ChangeTrackingService = require('./change-tracking-service')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')

function _toPlain (row) {
  if (!row) {
    return null
  }
  return typeof row.toJSON === 'function' ? row.toJSON() : row
}

function toWireModel (row) {
  const plain = _toPlain(row)
  if (!plain) {
    return null
  }
  return {
    uuid: plain.uuid,
    name: plain.name,
    repo: plain.repo,
    revision: plain.revision != null ? plain.revision : '',
    registryId: plain.registryId,
    files: Array.isArray(plain.files) ? plain.files : [],
    format: plain.format
  }
}

async function findLinkedFogUuids (model, transaction) {
  if (!model || typeof model.getFogs !== 'function') {
    return []
  }
  const fogs = await model.getFogs({ transaction })
  return fogs.map((fog) => fog.uuid)
}

async function _updateChangeTrackingForFogs (fogUuids, transaction) {
  for (const fogUuid of fogUuids) {
    await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.models, transaction)
  }
}

async function findMicroservicesBindingModelName (modelName, options, transaction) {
  const items = await MicroserviceModelItemManager.findAll({ name: modelName }, transaction)
  const blocking = []
  for (const item of items) {
    if (options && options.fogUuid) {
      const microservice = await MicroserviceManager.findOne({ uuid: item.microserviceUuid }, transaction)
      if (!microservice || microservice.iofogUuid !== options.fogUuid) {
        continue
      }
      blocking.push(microservice.uuid)
      continue
    }
    blocking.push(item.microserviceUuid)
  }
  return blocking
}

async function _validateRegistryAndFiles (registryId, files, transaction) {
  const registry = await RegistryManager.findOne({ id: registryId }, transaction)
  if (!registry) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, registryId))
  }
  const type = registry.type || 'oci'
  const fileList = Array.isArray(files) ? files : []
  if (type === 'hf') {
    if (fileList.length === 0) {
      throw new Errors.ValidationError(ErrorMessages.MODEL_HF_FILES_REQUIRED)
    }
  } else if (fileList.length > 0) {
    throw new Errors.ValidationError(ErrorMessages.MODEL_OCI_FILES_FORBIDDEN)
  }
  return registry
}

async function getModelByName (name, transaction) {
  const model = await FleetModelManager.findOne({ name }, transaction)
  if (!model) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.MODEL_NOT_FOUND, name))
  }
  return model
}

async function listModelsEndpoint (transaction) {
  const models = await FleetModelManager.findAll({}, transaction)
  return {
    models: models.map(toWireModel)
  }
}

async function getModelEndpoint (name, transaction) {
  const model = await getModelByName(name, transaction)
  return toWireModel(model)
}

async function upsertModelEndpoint (name, data, transaction) {
  const existing = await FleetModelManager.findOne({ name }, transaction)
  if (existing) {
    return updateModelEndpoint(name, data, transaction)
  }
  return createModelEndpoint({ ...data, name }, transaction)
}

async function createModelEndpoint (data, transaction) {
  await Validator.validate(data, Validator.schemas.modelCreate)

  const existing = await FleetModelManager.findOne({ name: data.name }, transaction)
  if (existing) {
    throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.MODEL_ALREADY_EXISTS, data.name))
  }

  const files = Array.isArray(data.files) ? data.files : []
  await _validateRegistryAndFiles(data.registryId, files, transaction)

  const created = await FleetModelManager.create({
    uuid: AppHelper.generateUUID(),
    name: data.name,
    repo: data.repo,
    revision: data.revision != null ? data.revision : '',
    registryId: data.registryId,
    files,
    format: data.format
  }, transaction)

  return toWireModel(created)
}

async function updateModelEndpoint (name, data, transaction) {
  await Validator.validate(data, Validator.schemas.modelUpdate)
  const model = await getModelByName(name, transaction)

  const nextRepo = data.repo !== undefined ? data.repo : model.repo
  const nextRevision = data.revision !== undefined ? data.revision : (model.revision != null ? model.revision : '')
  const nextRegistryId = data.registryId !== undefined ? data.registryId : model.registryId
  const nextFiles = data.files !== undefined ? data.files : (Array.isArray(model.files) ? model.files : [])
  const nextFormat = data.format !== undefined ? data.format : model.format

  await _validateRegistryAndFiles(nextRegistryId, nextFiles, transaction)

  const linkedFogUuids = await findLinkedFogUuids(model, transaction)

  await FleetModelManager.update({ name }, {
    repo: nextRepo,
    revision: nextRevision,
    registryId: nextRegistryId,
    files: nextFiles,
    format: nextFormat
  }, transaction)

  if (linkedFogUuids.length > 0) {
    await _updateChangeTrackingForFogs(linkedFogUuids, transaction)
  }

  return getModelEndpoint(name, transaction)
}

async function deleteModelEndpoint (name, transaction) {
  const model = await getModelByName(name, transaction)
  const blocking = await findMicroservicesBindingModelName(name, {}, transaction)
  if (blocking.length > 0) {
    throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.MODEL_IN_USE, name, blocking.join(', ')))
  }

  const linkedFogUuids = await findLinkedFogUuids(model, transaction)
  await FleetModelManager.delete({ name }, transaction)
  if (linkedFogUuids.length > 0) {
    await _updateChangeTrackingForFogs(linkedFogUuids, transaction)
  }
  return {}
}

async function getModelLinkEndpoint (name, transaction) {
  const model = await getModelByName(name, transaction)
  return {
    fogUuids: await findLinkedFogUuids(model, transaction)
  }
}

async function linkModelEndpoint (name, fogUuids, transaction) {
  await Validator.validate({ fogUuids }, Validator.schemas.modelLink)
  const model = await getModelByName(name, transaction)
  const alreadyLinked = new Set(await findLinkedFogUuids(model, transaction))

  for (const fogUuid of fogUuids) {
    const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
    if (!agent) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
    }
    await agent.addModel(model, { transaction })
  }

  const newlyLinked = fogUuids.filter((uuid) => !alreadyLinked.has(uuid))
  if (newlyLinked.length > 0) {
    await _updateChangeTrackingForFogs(newlyLinked, transaction)
  }

  return getModelEndpoint(name, transaction)
}

async function unlinkModelEndpoint (name, fogUuids, transaction) {
  await Validator.validate({ fogUuids }, Validator.schemas.modelUnlink)
  const model = await getModelByName(name, transaction)

  for (const fogUuid of fogUuids) {
    const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
    if (!agent) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
    }
    const blocking = await findMicroservicesBindingModelName(name, { fogUuid }, transaction)
    if (blocking.length > 0) {
      throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.MODEL_UNLINK_IN_USE, name, fogUuid, blocking.join(', ')))
    }
    await agent.removeModel(model, { transaction })
  }

  await _updateChangeTrackingForFogs(fogUuids, transaction)
  return {}
}

async function ensureModelsLinkedToFog (fogUuid, modelNames, transaction) {
  const names = [...new Set((modelNames || []).filter((name) => typeof name === 'string' && name.length > 0))]
  if (names.length === 0) {
    return []
  }

  const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
  if (!agent) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
  }

  const newlyLinked = []
  for (const name of names) {
    const model = await getModelByName(name, transaction)
    const alreadyLinked = typeof agent.hasModel === 'function'
      ? await agent.hasModel(model, { transaction })
      : false
    if (alreadyLinked) {
      continue
    }
    await agent.addModel(model, { transaction })
    newlyLinked.push(name)
  }

  if (newlyLinked.length > 0) {
    await _updateChangeTrackingForFogs([fogUuid], transaction)
  }

  return newlyLinked
}

module.exports = {
  listModelsEndpoint: TransactionDecorator.generateTransaction(listModelsEndpoint),
  getModelEndpoint: TransactionDecorator.generateTransaction(getModelEndpoint),
  createModelEndpoint: TransactionDecorator.generateTransaction(createModelEndpoint),
  updateModelEndpoint: TransactionDecorator.generateTransaction(updateModelEndpoint),
  deleteModelEndpoint: TransactionDecorator.generateTransaction(deleteModelEndpoint),
  getModelLinkEndpoint: TransactionDecorator.generateTransaction(getModelLinkEndpoint),
  linkModelEndpoint: TransactionDecorator.generateTransaction(linkModelEndpoint),
  unlinkModelEndpoint: TransactionDecorator.generateTransaction(unlinkModelEndpoint),
  upsertModelEndpoint: TransactionDecorator.generateTransaction(upsertModelEndpoint),
  ensureModelsLinkedToFog: TransactionDecorator.generateTransaction(ensureModelsLinkedToFog),
  toWireModel
}
