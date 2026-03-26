const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')
const VolumeMountingManager = require('../data/managers/volume-mounting-manager')
const SecretManager = require('../data/managers/secret-manager')
const ConfigMapManager = require('../data/managers/config-map-manager')
const ChangeTrackingService = require('./change-tracking-service')
const FogManager = require('../data/managers/iofog-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')

async function findVolumeMountedFogNodes (volumeMountName, transaction) {
  const volumeMount = await VolumeMountingManager.findOne({
    name: volumeMountName
  }, transaction)

  if (!volumeMount) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.VOLUME_MOUNT_NOT_FOUND, volumeMountName))
  }

  const fogs = await volumeMount.getFogs({}, transaction)
  return fogs.map(fog => fog.uuid)
}

async function _updateChangeTrackingForFogs (fogUuids, transaction) {
  for (const fogUuid of fogUuids) {
    await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.volumeMounts, transaction)
  }
}

async function listVolumeMountsEndpoint (transaction) {
  return VolumeMountingManager.findAll({}, transaction)
}

async function getVolumeMountEndpoint (name, transaction) {
  const volumeMount = await VolumeMountingManager.findOne({
    name: name
  }, transaction)

  if (!volumeMount) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.VOLUME_MOUNT_NOT_FOUND, name))
  }

  return volumeMount
}

async function createVolumeMountEndpoint (data, transaction) {
  await Validator.validate(data, Validator.schemas.volumeMountCreate)
  // Validate that either secretName or configMapName is provided
  if (!data.secretName && !data.configMapName) {
    throw new Errors.ValidationError('Must specify either secretName or configMapName')
  }

  // Validate that both are not provided
  if (data.secretName && data.configMapName) {
    throw new Errors.ValidationError('Cannot specify both secretName and configMapName')
  }

  const existingVolumeMount = await VolumeMountingManager.findOne({ name: data.name }, transaction)
  if (existingVolumeMount) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, data.name))
  }

  // Check if secret/configMap exists
  if (data.secretName) {
    const secret = await SecretManager.getSecret(data.secretName, transaction)
    if (!secret) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, data.secretName))
    }
  }

  if (data.configMapName) {
    const configMap = await ConfigMapManager.getConfigMap(data.configMapName, transaction)
    if (!configMap) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_NOT_FOUND, data.configMapName))
    }
  }
  const volumeMountObj = {
    uuid: AppHelper.generateUUID(),
    version: 1,
    name: data.name,
    configMapName: data.configMapName,
    secretName: data.secretName
  }
  return VolumeMountingManager.create(volumeMountObj, transaction)
}

async function updateVolumeMountEndpoint (name, data, transaction) {
  await Validator.validate(data, Validator.schemas.volumeMountUpdate)
  const volumeMount = await getVolumeMountEndpoint(name, transaction)
  const existingVersion = volumeMount.version

  // Validate that either secretName or configMapName is provided
  if (!data.secretName && !data.configMapName) {
    throw new Errors.ValidationError('Must specify either secretName or configMapName')
  }

  // Validate that both are not provided
  if (data.secretName && data.configMapName) {
    throw new Errors.ValidationError('Cannot specify both secretName and configMapName')
  }
  // Check if secret/configMap exists
  if (data.secretName) {
    const secret = await SecretManager.getSecret(data.secretName, transaction)
    if (!secret) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, data.secretName))
    }
  }

  if (data.configMapName) {
    const configMap = await ConfigMapManager.getConfigMap(data.configMapName, transaction)
    if (!configMap) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_NOT_FOUND, data.configMapName))
    }
  }

  // Get linked fog nodes before update
  const linkedFogUuids = await findVolumeMountedFogNodes(name, transaction)

  // Update volume mount
  const updatedVolumeMountObj = {
    uuid: volumeMount.uuid,
    version: existingVersion + 1,
    name: volumeMount.name,
    configMapName: data.configMapName,
    secretName: data.secretName
  }
  await VolumeMountingManager.update({ name: name }, updatedVolumeMountObj, transaction)

  // Update change tracking for all linked fog nodes
  await _updateChangeTrackingForFogs(linkedFogUuids, transaction)

  return getVolumeMountEndpoint(name, transaction)
}

async function deleteVolumeMountEndpoint (name, transaction) {
  // Get linked fog nodes before deletion
  const linkedFogUuids = await findVolumeMountedFogNodes(name, transaction)

  // Delete volume mount
  await VolumeMountingManager.delete({ name: name }, transaction)

  // Update change tracking for all linked fog nodes
  await _updateChangeTrackingForFogs(linkedFogUuids, transaction)

  return {}
}

async function linkVolumeMountEndpoint (name, fogUuids, transaction) {
  await Validator.validate({ fogUuids }, Validator.schemas.volumeMountLink)

  const volumeMount = await getVolumeMountEndpoint(name, transaction)

  const alreadyLinked = new Set(await findVolumeMountedFogNodes(name, transaction))

  for (const fogUuid of fogUuids) {
    const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
    if (!agent) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
    }
    await agent.addVolumeMount(volumeMount.uuid, transaction)
  }

  const newlyLinked = fogUuids.filter((uuid) => !alreadyLinked.has(uuid))
  if (newlyLinked.length > 0) {
    await _updateChangeTrackingForFogs(newlyLinked, transaction)
  }

  return getVolumeMountEndpoint(name, transaction)
}

async function unlinkVolumeMountEndpoint (name, fogUuids, transaction) {
  await Validator.validate({ fogUuids }, Validator.schemas.volumeMountUnlink)

  const volumeMount = await getVolumeMountEndpoint(name, transaction)

  for (const fogUuid of fogUuids) {
    const agent = await FogManager.findOne({ uuid: fogUuid }, transaction)
    if (!agent) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, fogUuid))
    }
    await agent.removeVolumeMount(volumeMount.uuid, transaction)
  }

  // Update change tracking for all unlinked fog nodes
  await _updateChangeTrackingForFogs(fogUuids, transaction)

  return {}
}

async function getVolumeMountLinkEndpoint (name, transaction) {
  const linkedFogUuids = await findVolumeMountedFogNodes(name, transaction)
  return {
    fogUuids: linkedFogUuids
  }
}

module.exports = {
  listVolumeMountsEndpoint: TransactionDecorator.generateTransaction(listVolumeMountsEndpoint),
  getVolumeMountEndpoint: TransactionDecorator.generateTransaction(getVolumeMountEndpoint),
  createVolumeMountEndpoint: TransactionDecorator.generateTransaction(createVolumeMountEndpoint),
  updateVolumeMountEndpoint: TransactionDecorator.generateTransaction(updateVolumeMountEndpoint),
  deleteVolumeMountEndpoint: TransactionDecorator.generateTransaction(deleteVolumeMountEndpoint),
  linkVolumeMountEndpoint: TransactionDecorator.generateTransaction(linkVolumeMountEndpoint),
  unlinkVolumeMountEndpoint: TransactionDecorator.generateTransaction(unlinkVolumeMountEndpoint),
  findVolumeMountedFogNodes: TransactionDecorator.generateTransaction(findVolumeMountedFogNodes),
  getVolumeMountLinkEndpoint: TransactionDecorator.generateTransaction(getVolumeMountLinkEndpoint)
}
