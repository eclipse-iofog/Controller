const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')
const { normalizeKnowledgeFormat } = require('../helpers/knowledge-format')
const FleetKnowledgeManager = require('../data/managers/fleet-knowledge-manager')
const RegistryManager = require('../data/managers/registry-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceKnowledgeItemManager = require('../data/managers/microservice-knowledge-item-manager')
const ApplicationManager = require('../data/managers/application-manager')
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

function toWireKnowledge (row) {
  const plain = _toPlain(row)
  if (!plain) {
    return null
  }
  const item = {
    uuid: plain.uuid,
    name: plain.name,
    repo: plain.repo,
    revision: plain.revision != null ? plain.revision : '',
    registryId: plain.registryId,
    files: Array.isArray(plain.files) ? plain.files : []
  }
  if (plain.format != null && plain.format !== '') {
    item.format = plain.format
  }
  return item
}

async function findLinkedFogUuids (knowledge, transaction) {
  if (!knowledge || typeof knowledge.getFogs !== 'function') {
    return []
  }
  const fogs = await knowledge.getFogs({ transaction })
  return fogs.map((fog) => fog.uuid)
}

async function _updateChangeTrackingForFogs (fogUuids, transaction) {
  for (const fogUuid of fogUuids) {
    await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.knowledge, transaction)
  }
}

async function _isUserMicroservice (microservice, transaction) {
  if (!microservice || microservice.isController) {
    return false
  }
  if (!microservice.applicationId) {
    return true
  }
  const application = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
  return !application || !application.isSystem
}

async function findMicroservicesBindingKnowledgeName (knowledgeName, options, transaction) {
  const items = await MicroserviceKnowledgeItemManager.findAll({ name: knowledgeName }, transaction)
  const blocking = []
  const userOnly = Boolean(options && options.userOnly)
  for (const item of items) {
    if (userOnly || (options && options.fogUuid)) {
      const microservice = await MicroserviceManager.findOne({ uuid: item.microserviceUuid }, transaction)
      if (!microservice) {
        continue
      }
      if (options && options.fogUuid && microservice.iofogUuid !== options.fogUuid) {
        continue
      }
      if (userOnly && !(await _isUserMicroservice(microservice, transaction))) {
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
  if (type !== 'hf' && fileList.length > 0) {
    throw new Errors.ValidationError(ErrorMessages.KNOWLEDGE_OCI_FILES_FORBIDDEN)
  }
  return registry
}

async function getKnowledgeByName (name, transaction) {
  const knowledge = await FleetKnowledgeManager.findOne({ name }, transaction)
  if (!knowledge) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.KNOWLEDGE_NOT_FOUND, name))
  }
  return knowledge
}

async function listKnowledgeEndpoint (transaction) {
  const knowledge = await FleetKnowledgeManager.findAll({}, transaction)
  return {
    knowledge: knowledge.map(toWireKnowledge)
  }
}

async function getKnowledgeEndpoint (name, transaction) {
  const knowledge = await getKnowledgeByName(name, transaction)
  return toWireKnowledge(knowledge)
}

async function upsertKnowledgeEndpoint (name, data, transaction) {
  const existing = await FleetKnowledgeManager.findOne({ name }, transaction)
  if (existing) {
    return updateKnowledgeEndpoint(name, data, transaction)
  }
  return createKnowledgeEndpoint({ ...data, name }, transaction)
}

async function createKnowledgeEndpoint (data, transaction) {
  await Validator.validate(data, Validator.schemas.knowledgeCreate)

  const existing = await FleetKnowledgeManager.findOne({ name: data.name }, transaction)
  if (existing) {
    throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.KNOWLEDGE_ALREADY_EXISTS, data.name))
  }

  const files = Array.isArray(data.files) ? data.files : []
  await _validateRegistryAndFiles(data.registryId, files, transaction)

  const created = await FleetKnowledgeManager.create({
    uuid: AppHelper.generateUUID(),
    name: data.name,
    repo: data.repo,
    revision: data.revision != null ? data.revision : '',
    registryId: data.registryId,
    files,
    format: normalizeKnowledgeFormat(data.format)
  }, transaction)

  return toWireKnowledge(created)
}

async function updateKnowledgeEndpoint (name, data, transaction) {
  await Validator.validate(data, Validator.schemas.knowledgeUpdate)
  const knowledge = await getKnowledgeByName(name, transaction)

  const nextRepo = data.repo !== undefined ? data.repo : knowledge.repo
  const nextRevision = data.revision !== undefined ? data.revision : (knowledge.revision != null ? knowledge.revision : '')
  const nextRegistryId = data.registryId !== undefined ? data.registryId : knowledge.registryId
  const nextFiles = data.files !== undefined ? data.files : (Array.isArray(knowledge.files) ? knowledge.files : [])
  const nextFormat = data.format !== undefined ? normalizeKnowledgeFormat(data.format) : knowledge.format

  await _validateRegistryAndFiles(nextRegistryId, nextFiles, transaction)

  const linkedFogUuids = await findLinkedFogUuids(knowledge, transaction)

  await FleetKnowledgeManager.update({ name }, {
    repo: nextRepo,
    revision: nextRevision,
    registryId: nextRegistryId,
    files: nextFiles,
    format: nextFormat
  }, transaction)

  if (linkedFogUuids.length > 0) {
    await _updateChangeTrackingForFogs(linkedFogUuids, transaction)
  }

  return getKnowledgeEndpoint(name, transaction)
}

async function deleteKnowledgeEndpoint (name, transaction) {
  const knowledge = await getKnowledgeByName(name, transaction)
  const blocking = await findMicroservicesBindingKnowledgeName(name, {}, transaction)
  if (blocking.length > 0) {
    throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.KNOWLEDGE_IN_USE, name, blocking.join(', ')))
  }

  const linkedFogUuids = await findLinkedFogUuids(knowledge, transaction)
  await FleetKnowledgeManager.delete({ name }, transaction)
  if (linkedFogUuids.length > 0) {
    await _updateChangeTrackingForFogs(linkedFogUuids, transaction)
  }
  return {}
}

async function getKnowledgeLinkEndpoint (name, transaction) {
  const knowledge = await getKnowledgeByName(name, transaction)
  return {
    fogUuids: await findLinkedFogUuids(knowledge, transaction)
  }
}

async function linkKnowledgeEndpoint (name, fogUuids, transaction) {
  await Validator.validate({ fogUuids }, Validator.schemas.knowledgeLink)
  const knowledge = await getKnowledgeByName(name, transaction)
  const alreadyLinked = new Set(await findLinkedFogUuids(knowledge, transaction))

  for (const fogUuid of fogUuids) {
    const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
    if (!agent) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
    }
    await agent.addKnowledge(knowledge, { transaction })
  }

  const newlyLinked = fogUuids.filter((uuid) => !alreadyLinked.has(uuid))
  if (newlyLinked.length > 0) {
    await _updateChangeTrackingForFogs(newlyLinked, transaction)
  }

  return getKnowledgeEndpoint(name, transaction)
}

async function unlinkKnowledgeEndpoint (name, fogUuids, transaction) {
  await Validator.validate({ fogUuids }, Validator.schemas.knowledgeUnlink)
  const knowledge = await getKnowledgeByName(name, transaction)

  for (const fogUuid of fogUuids) {
    const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
    if (!agent) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
    }
    const blocking = await findMicroservicesBindingKnowledgeName(name, { fogUuid, userOnly: true }, transaction)
    if (blocking.length > 0) {
      throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.KNOWLEDGE_UNLINK_IN_USE, name, fogUuid, blocking.join(', ')))
    }
    await agent.removeKnowledge(knowledge, { transaction })
  }

  await _updateChangeTrackingForFogs(fogUuids, transaction)
  return {}
}

async function ensureKnowledgeLinkedToFog (fogUuid, names, transaction) {
  const knowledgeNames = [...new Set((names || []).filter((name) => typeof name === 'string' && name.length > 0))]
  if (knowledgeNames.length === 0) {
    return []
  }

  const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
  if (!agent) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
  }

  const newlyLinked = []
  for (const name of knowledgeNames) {
    const knowledge = await FleetKnowledgeManager.findOne({ name }, transaction)
    if (!knowledge) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.KNOWLEDGE_NOT_FOUND, name))
    }
    const alreadyLinked = typeof agent.hasKnowledge === 'function'
      ? await agent.hasKnowledge(knowledge, { transaction })
      : false
    if (alreadyLinked) {
      continue
    }
    await agent.addKnowledge(knowledge, { transaction })
    newlyLinked.push(name)
  }

  if (newlyLinked.length > 0) {
    await _updateChangeTrackingForFogs([fogUuid], transaction)
  }

  return newlyLinked
}

module.exports = {
  listKnowledgeEndpoint: TransactionDecorator.generateTransaction(listKnowledgeEndpoint),
  getKnowledgeEndpoint: TransactionDecorator.generateTransaction(getKnowledgeEndpoint),
  createKnowledgeEndpoint: TransactionDecorator.generateTransaction(createKnowledgeEndpoint),
  updateKnowledgeEndpoint: TransactionDecorator.generateTransaction(updateKnowledgeEndpoint),
  deleteKnowledgeEndpoint: TransactionDecorator.generateTransaction(deleteKnowledgeEndpoint),
  getKnowledgeLinkEndpoint: TransactionDecorator.generateTransaction(getKnowledgeLinkEndpoint),
  linkKnowledgeEndpoint: TransactionDecorator.generateTransaction(linkKnowledgeEndpoint),
  unlinkKnowledgeEndpoint: TransactionDecorator.generateTransaction(unlinkKnowledgeEndpoint),
  upsertKnowledgeEndpoint: TransactionDecorator.generateTransaction(upsertKnowledgeEndpoint),
  ensureKnowledgeLinkedToFog: TransactionDecorator.generateTransaction(ensureKnowledgeLinkedToFog),
  toWireKnowledge
}
