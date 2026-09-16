const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')
const RuntimeClassManager = require('../data/managers/runtime-class-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const FogManager = require('../data/managers/iofog-manager')
const ChangeTrackingService = require('./change-tracking-service')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')
const logger = require('../logger')

const CATALOG_HANDLERS = new Set([
  'spin',
  'edgelet-wasmtime',
  'wasmtime',
  'wasmedge',
  'nvidia-cdi'
])

function _toPlain (row) {
  if (!row) {
    return null
  }
  return typeof row.toJSON === 'function' ? row.toJSON() : row
}

function toWireRuntimeClass (row) {
  const plain = _toPlain(row)
  if (!plain) {
    return null
  }
  return {
    name: plain.name,
    handler: plain.handler
  }
}

function _warnIfUnknownHandler (name, handler) {
  if (!handler || CATALOG_HANDLERS.has(handler)) {
    return
  }
  logger.warn(
    `RuntimeClass '${name}' handler '${handler}' is not in the known catalog; applying it may restart the data plane`
  )
}

async function findLinkedFogUuids (runtimeClass, transaction) {
  if (!runtimeClass || typeof runtimeClass.getFogs !== 'function') {
    return []
  }
  const fogs = await runtimeClass.getFogs({ transaction })
  return fogs.map((fog) => fog.uuid)
}

async function _updateChangeTrackingForFogs (fogUuids, transaction) {
  for (const fogUuid of fogUuids) {
    await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.runtimeClasses, transaction)
  }
}

async function findMicroservicesPinningRuntime (className, options, transaction) {
  const where = { runtime: className }
  if (options && options.fogUuid) {
    where.iofogUuid = options.fogUuid
  }
  const microservices = await MicroserviceManager.findAll(where, transaction)
  return microservices.map((microservice) => microservice.uuid)
}

async function getRuntimeClassByName (name, transaction) {
  const runtimeClass = await RuntimeClassManager.findOne({ name }, transaction)
  if (!runtimeClass) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.RUNTIME_CLASS_NOT_FOUND, name))
  }
  return runtimeClass
}

async function listRuntimeClassesEndpoint (transaction) {
  const runtimeClasses = await RuntimeClassManager.findAll({}, transaction)
  return {
    runtimeClasses: runtimeClasses.map(toWireRuntimeClass)
  }
}

async function getRuntimeClassEndpoint (name, transaction) {
  const runtimeClass = await getRuntimeClassByName(name, transaction)
  return toWireRuntimeClass(runtimeClass)
}

async function upsertRuntimeClassEndpoint (name, data, transaction) {
  const existing = await RuntimeClassManager.findOne({ name }, transaction)
  if (existing) {
    return updateRuntimeClassEndpoint(name, data, transaction)
  }
  return createRuntimeClassEndpoint({ ...data, name }, transaction)
}

async function createRuntimeClassEndpoint (data, transaction) {
  await Validator.validate(data, Validator.schemas.runtimeClassCreate)

  const existing = await RuntimeClassManager.findOne({ name: data.name }, transaction)
  if (existing) {
    throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.RUNTIME_CLASS_ALREADY_EXISTS, data.name))
  }

  const created = await RuntimeClassManager.create({
    name: data.name,
    handler: data.handler
  }, transaction)

  return toWireRuntimeClass(created)
}

async function updateRuntimeClassEndpoint (name, data, transaction) {
  await Validator.validate(data, Validator.schemas.runtimeClassUpdate)
  const runtimeClass = await getRuntimeClassByName(name, transaction)

  const nextHandler = data.handler !== undefined ? data.handler : runtimeClass.handler
  const linkedFogUuids = await findLinkedFogUuids(runtimeClass, transaction)

  await RuntimeClassManager.update({ name }, {
    handler: nextHandler
  }, transaction)

  if (linkedFogUuids.length > 0) {
    await _updateChangeTrackingForFogs(linkedFogUuids, transaction)
  }

  return getRuntimeClassEndpoint(name, transaction)
}

async function deleteRuntimeClassEndpoint (name, transaction) {
  const runtimeClass = await getRuntimeClassByName(name, transaction)
  const blocking = await findMicroservicesPinningRuntime(name, {}, transaction)
  if (blocking.length > 0) {
    throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.RUNTIME_CLASS_IN_USE, name, blocking.join(', ')))
  }

  const linkedFogUuids = await findLinkedFogUuids(runtimeClass, transaction)
  await RuntimeClassManager.delete({ name }, transaction)
  if (linkedFogUuids.length > 0) {
    await _updateChangeTrackingForFogs(linkedFogUuids, transaction)
  }
  return {}
}

async function getRuntimeClassLinkEndpoint (name, transaction) {
  const runtimeClass = await getRuntimeClassByName(name, transaction)
  return {
    fogUuids: await findLinkedFogUuids(runtimeClass, transaction)
  }
}

async function linkRuntimeClassEndpoint (name, fogUuids, transaction) {
  await Validator.validate({ fogUuids }, Validator.schemas.runtimeClassLink)
  const runtimeClass = await getRuntimeClassByName(name, transaction)
  const alreadyLinked = new Set(await findLinkedFogUuids(runtimeClass, transaction))

  _warnIfUnknownHandler(name, runtimeClass.handler)

  for (const fogUuid of fogUuids) {
    const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
    if (!agent) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
    }
    if (agent.containerEngine !== 'edgelet') {
      throw new Errors.ValidationError(
        AppHelper.formatMessage(ErrorMessages.RUNTIME_CLASS_LINK_REQUIRES_EDGELET, fogUuid)
      )
    }
    await runtimeClass.addFog(agent, { transaction })
  }

  const newlyLinked = fogUuids.filter((uuid) => !alreadyLinked.has(uuid))
  if (newlyLinked.length > 0) {
    await _updateChangeTrackingForFogs(newlyLinked, transaction)
  }

  return getRuntimeClassEndpoint(name, transaction)
}

async function unlinkRuntimeClassEndpoint (name, fogUuids, transaction) {
  await Validator.validate({ fogUuids }, Validator.schemas.runtimeClassUnlink)
  const runtimeClass = await getRuntimeClassByName(name, transaction)

  for (const fogUuid of fogUuids) {
    const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
    if (!agent) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
    }
    const blocking = await findMicroservicesPinningRuntime(name, { fogUuid }, transaction)
    if (blocking.length > 0) {
      throw new Errors.ConflictError(
        AppHelper.formatMessage(ErrorMessages.RUNTIME_CLASS_UNLINK_IN_USE, name, fogUuid, blocking.join(', '))
      )
    }
    await runtimeClass.removeFog(agent, { transaction })
  }

  await _updateChangeTrackingForFogs(fogUuids, transaction)
  return {}
}

async function ensureRuntimeClassLinkedToFog (fogUuid, className, transaction) {
  if (typeof className !== 'string' || className.length === 0) {
    return false
  }

  const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
  if (!agent) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
  }

  const runtimeClass = await RuntimeClassManager.findOne({ name: className }, transaction)
  if (!runtimeClass) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.RUNTIME_CLASS_MISSING, className))
  }

  if (agent.containerEngine !== 'edgelet') {
    return false
  }

  const alreadyLinked = typeof runtimeClass.hasFog === 'function'
    ? await runtimeClass.hasFog(agent, { transaction })
    : false
  if (alreadyLinked) {
    return false
  }

  await runtimeClass.addFog(agent, { transaction })
  await _updateChangeTrackingForFogs([fogUuid], transaction)
  return true
}

module.exports = {
  listRuntimeClassesEndpoint: TransactionDecorator.generateTransaction(listRuntimeClassesEndpoint),
  getRuntimeClassEndpoint: TransactionDecorator.generateTransaction(getRuntimeClassEndpoint),
  createRuntimeClassEndpoint: TransactionDecorator.generateTransaction(createRuntimeClassEndpoint),
  updateRuntimeClassEndpoint: TransactionDecorator.generateTransaction(updateRuntimeClassEndpoint),
  deleteRuntimeClassEndpoint: TransactionDecorator.generateTransaction(deleteRuntimeClassEndpoint),
  getRuntimeClassLinkEndpoint: TransactionDecorator.generateTransaction(getRuntimeClassLinkEndpoint),
  linkRuntimeClassEndpoint: TransactionDecorator.generateTransaction(linkRuntimeClassEndpoint),
  unlinkRuntimeClassEndpoint: TransactionDecorator.generateTransaction(unlinkRuntimeClassEndpoint),
  upsertRuntimeClassEndpoint: TransactionDecorator.generateTransaction(upsertRuntimeClassEndpoint),
  ensureRuntimeClassLinkedToFog: TransactionDecorator.generateTransaction(ensureRuntimeClassLinkedToFog),
  toWireRuntimeClass
}
