const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas/index')
const Errors = require('../helpers/errors')
const AppHelper = require('../helpers/app-helper')
const ErrorMessages = require('../helpers/error-messages')
const { ensureSystemApplication } = require('../helpers/system-naming')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const CatalogItemImageManager = require('../data/managers/catalog-item-image-manager')
const RegistryManager = require('../data/managers/registry-manager')
const VolumeMappingManager = require('../data/managers/volume-mapping-manager')
const ConfigMapManager = require('../data/managers/config-map-manager')
const SecretManager = require('../data/managers/secret-manager')
const MicroservicesService = require('./microservices-service')
const MicroservicePortService = require('./microservice-ports/microservice-port')
const VolumeMountService = require('./volume-mount-service')
const WorkloadSpec = require('./microservice-workload-spec')
const isEqual = require('lodash/isEqual')
const Op = require('sequelize').Op
const { VOLUME_MAPPING_DEFAULT } = require('../helpers/constants')

const CONTROLLER_MS_NAME = 'controller'
const SERVICE_ACCOUNT_VOLUME_TYPE = 'serviceAccount'

function _parseFogAvailableRuntimes (fog) {
  if (!fog || fog.availableRuntimes == null || fog.availableRuntimes === '') {
    return []
  }
  if (Array.isArray(fog.availableRuntimes)) {
    return fog.availableRuntimes
  }
  try {
    const parsed = JSON.parse(fog.availableRuntimes)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function _validateMicroserviceRuntime (runtime, fog) {
  if (runtime == null || runtime === '') {
    return
  }
  const availableRuntimes = _parseFogAvailableRuntimes(fog)
  if (!availableRuntimes.includes(runtime)) {
    const agentLabel = fog.name || fog.uuid || 'agent'
    throw new Errors.ValidationError(
      `Runtime '${runtime}' is not available on agent '${agentLabel}'`
    )
  }
}

const { validateImageMatchesFogArch } = require('../helpers/arch-images')

function _validateImageArch (name, fog, images) {
  validateImageMatchesFogArch(name, fog, images)
}

function _rejectServiceAccountVolumeMappings (volumeMappings) {
  if (!volumeMappings) {
    return
  }
  for (const mapping of volumeMappings) {
    const type = mapping.type || VOLUME_MAPPING_DEFAULT
    if (type === SERVICE_ACCOUNT_VOLUME_TYPE) {
      throw new Errors.ValidationError(
        'Volume mappings of type serviceAccount are system-managed and cannot be set by users'
      )
    }
  }
}

function _validateVolumeMappingFields (volumeMappings) {
  _rejectServiceAccountVolumeMappings(volumeMappings)
  if (!volumeMappings) {
    return
  }
  for (const mapping of volumeMappings) {
    mapping.type = mapping.type || VOLUME_MAPPING_DEFAULT
    if (mapping.type === 'volume' && (!/^[a-zA-Z0-9_.-]/.test(mapping.hostDestination))) {
      throw new Errors.InvalidArgumentError('hostDestination includes invalid characters for a local volume name, only ' +
        '"[a-zA-Z0-9][a-zA-Z0-9_.-]" are allowed. If you intended to pass a host directory, use type: bind')
    }
    if (mapping.type === 'volumeMount') {
      if (!mapping.hostDestination || mapping.hostDestination === '') {
        throw new Errors.ValidationError('hostDestination is required when type is volumeMount')
      }
    }
  }
}

function _validateKeyPath (data, keyPath, resourceName, resourceType, volumeMountName) {
  if (!keyPath || keyPath === '') {
    return true
  }
  if (data[keyPath] !== undefined && data[keyPath] !== null) {
    return true
  }
  const keyPathWithSlash = keyPath.endsWith('/') ? keyPath : `${keyPath}/`
  const hasMatchingKey = Object.keys(data).some((key) => key.startsWith(keyPathWithSlash))
  if (hasMatchingKey) {
    return true
  }
  if (resourceType === 'Secret') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SECRET_KEY_NOT_FOUND_IN_VOLUME_MOUNT, keyPath, resourceName, volumeMountName))
  }
  throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_KEY_NOT_FOUND_IN_VOLUME_MOUNT, keyPath, resourceName, volumeMountName))
}

async function _validateVolumeMountReference (hostDestination, type, fogUuid, transaction) {
  if (!hostDestination || typeof hostDestination !== 'string' || type !== 'volumeMount') {
    return
  }

  const parts = hostDestination.split('/')
  const volumeMountName = parts[0]
  const keyPath = parts.length > 1 ? parts.slice(1).join('/') : null

  if (!volumeMountName) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_VOLUME_MOUNT_REFERENCE_FOR_VOLUME_MAPPING, 'Volume mount name cannot be empty'))
  }

  let volumeMount
  try {
    volumeMount = await VolumeMountService.getVolumeMountEndpoint(volumeMountName, transaction)
  } catch (error) {
    if (error instanceof Errors.NotFoundError) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.VOLUME_MOUNT_NOT_FOUND, volumeMountName))
    }
    throw error
  }

  if (keyPath && keyPath !== '') {
    if (volumeMount.secretName) {
      const secret = await SecretManager.getSecret(volumeMount.secretName, transaction)
      if (!secret) {
        throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, volumeMount.secretName))
      }
      _validateKeyPath(secret.data, keyPath, volumeMount.secretName, 'Secret', volumeMountName)
    } else if (volumeMount.configMapName) {
      const configMap = await ConfigMapManager.getConfigMap(volumeMount.configMapName, transaction)
      if (!configMap) {
        throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_NOT_FOUND, volumeMount.configMapName))
      }
      _validateKeyPath(configMap.data, keyPath, volumeMount.configMapName, 'ConfigMap', volumeMountName)
    } else {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_VOLUME_MOUNT_REFERENCE_FOR_VOLUME_MAPPING, `Volume mount ${volumeMountName} does not have a secret or configmap associated`))
    }
  }

  const linkedFogUuids = await VolumeMountService.findVolumeMountedFogNodes(volumeMountName, transaction)
  if (!linkedFogUuids.includes(fogUuid)) {
    await VolumeMountService.linkVolumeMountEndpoint(volumeMountName, [fogUuid], transaction)
  }
}

async function _validateVolumeMappingsForFog (volumeMappings, fogUuid, transaction) {
  _validateVolumeMappingFields(volumeMappings)
  if (!volumeMappings || !fogUuid) {
    return
  }
  for (const volumeMapping of volumeMappings) {
    if (volumeMapping.hostDestination) {
      const type = volumeMapping.type || VOLUME_MAPPING_DEFAULT
      await _validateVolumeMountReference(volumeMapping.hostDestination, type, fogUuid, transaction)
    }
  }
}

async function _validateRegistry (registryId, transaction) {
  const registry = await RegistryManager.findOne({ id: registryId }, transaction)
  if (!registry) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, registryId))
  }
}

async function _checkForDuplicateName (name, excludeUuid, applicationId, transaction) {
  const where = {
    name,
    applicationId,
    delete: false,
    uuid: { [Op.ne]: excludeUuid }
  }
  const result = await MicroserviceManager.findOne(where, transaction)
  if (result) {
    throw new Errors.DuplicatePropertyError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, name))
  }
}

function _imagesChanged (newImages, existingImages) {
  const oldContainerImages = existingImages.map((img) => img.containerImage)
  const newContainerImages = newImages.map((img) => img.containerImage)
  return !isEqual(newContainerImages, oldContainerImages)
}

async function _createMicroserviceImages (microserviceUuid, images, transaction) {
  const newImages = images.map((img) => ({
    ...img,
    microserviceUuid
  }))
  return CatalogItemImageManager.bulkCreate(newImages, transaction)
}

async function _createVolumeMappings (microserviceUuid, volumeMappings, transaction) {
  if (!volumeMappings || !volumeMappings.length) {
    return
  }
  const mappings = volumeMappings.map((volumeMapping) => ({
    microserviceUuid,
    hostDestination: volumeMapping.hostDestination,
    containerDestination: volumeMapping.containerDestination,
    accessMode: volumeMapping.accessMode,
    type: volumeMapping.type || VOLUME_MAPPING_DEFAULT
  }))
  await VolumeMappingManager.bulkCreate(mappings, transaction)
}

async function _updateVolumeMappings (microserviceUuid, volumeMappings, fogUuid, transaction) {
  await _validateVolumeMappingsForFog(volumeMappings, fogUuid, transaction)
  await VolumeMappingManager.delete({ microserviceUuid }, transaction)
  await _createVolumeMappings(microserviceUuid, volumeMappings, transaction)
}

async function _updateImages (images, microserviceUuid, transaction) {
  await CatalogItemImageManager.delete({ microserviceUuid }, transaction)
  await _createMicroserviceImages(microserviceUuid, images, transaction)
}

async function _updatePorts (ports, microservice, transaction) {
  await MicroservicePortService.deletePortMappings(microservice, transaction)
  for (const mapping of ports) {
    await MicroservicePortService.createPortMapping(microservice, mapping, transaction)
  }
}

async function _createControllerMicroservice (registerData, fog, application, validatedExtraHosts, transaction) {
  await _checkForDuplicateName(CONTROLLER_MS_NAME, registerData.uuid, application.id, transaction)

  const microserviceData = {
    uuid: registerData.uuid,
    name: CONTROLLER_MS_NAME,
    iofogUuid: fog.uuid,
    registryId: registerData.registryId,
    schedule: 0,
    applicationId: application.id,
    isController: true,
    ...WorkloadSpec.buildCreateScalarColumns(registerData)
  }

  const microservice = await MicroserviceManager.create(
    AppHelper.deleteUndefinedFields(microserviceData),
    transaction
  )

  await _createMicroserviceImages(microservice.uuid, registerData.images, transaction)

  if (registerData.ports) {
    await MicroservicePortService.validatePortMappings({ ports: registerData.ports, iofogUuid: fog.uuid }, transaction)
    for (const mapping of registerData.ports) {
      await MicroservicePortService.createPortMapping(microservice, mapping, transaction)
    }
  }

  await _createVolumeMappings(microservice.uuid, registerData.volumeMappings, transaction)

  await WorkloadSpec.createWorkloadRelations(microservice, registerData, {
    validatedExtraHosts,
    transaction
  })

  await MicroserviceStatusManager.create({ microserviceUuid: microservice.uuid }, transaction)
  await MicroserviceExecStatusManager.create({ microserviceUuid: microservice.uuid }, transaction)

  await MicroservicesService.updateChangeTracking(false, fog.uuid, transaction)

  return microservice
}

async function _updateControllerMicroservice (existing, registerData, fog, validatedExtraHosts, transaction) {
  const existingImages = await CatalogItemImageManager.findAll({
    microserviceUuid: existing.uuid
  }, transaction)

  const config = registerData.config !== undefined
    ? WorkloadSpec.validateMicroserviceConfig(registerData.config)
    : undefined
  const annotations = registerData.annotations !== undefined
    ? WorkloadSpec.validateMicroserviceAnnotations(registerData.annotations)
    : undefined

  const imagesChanged = registerData.images &&
    registerData.images.length > 0 &&
    _imagesChanged(registerData.images, existingImages)

  const microserviceUpdate = AppHelper.deleteUndefinedFields({
    isController: true,
    schedule: 0,
    registryId: registerData.registryId,
    config,
    annotations,
    rebuild: false,
    ...WorkloadSpec.buildScalarColumns(registerData)
  })

  if (imagesChanged) {
    await _updateImages(registerData.images, existing.uuid, transaction)
    microserviceUpdate.rebuild = true
  }

  microserviceUpdate.rebuild = microserviceUpdate.rebuild || WorkloadSpec.shouldRebuildForWorkloadChange(
    existing,
    registerData,
    { config, annotations, imagesChanged }
  )

  const updatedMicroservice = await MicroserviceManager.updateAndFind(
    { uuid: existing.uuid },
    microserviceUpdate,
    transaction
  )

  if (registerData.ports) {
    await MicroservicePortService.validatePortMappings({ ports: registerData.ports, iofogUuid: fog.uuid }, transaction)
    await _updatePorts(registerData.ports, updatedMicroservice, transaction)
  }

  if (registerData.volumeMappings) {
    await _updateVolumeMappings(existing.uuid, registerData.volumeMappings, fog.uuid, transaction)
  }

  await WorkloadSpec.updateWorkloadRelations(existing.uuid, registerData, {
    validatedExtraHosts: registerData.extraHosts ? validatedExtraHosts : undefined,
    transaction
  })

  await MicroservicesService.updateChangeTracking(true, fog.uuid, transaction)

  return updatedMicroservice
}

async function registerControllerMicroservice (registerData, fog, transaction) {
  await Validator.validate(registerData, Validator.schemas.controllerRegister)

  if (!fog || !fog.isSystem) {
    throw new Errors.ForbiddenError('Controller register is only available on system fogs')
  }

  registerData.name = registerData.name || CONTROLLER_MS_NAME

  if (!registerData.images || !registerData.images.length) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_DOES_NOT_HAVE_IMAGES, registerData.name))
  }

  await _validateRegistry(registerData.registryId, transaction)
  _validateMicroserviceRuntime(registerData.runtime, fog)
  _validateImageArch(registerData.name, fog, registerData.images)
  _validateVolumeMappingFields(registerData.volumeMappings)
  await _validateVolumeMappingsForFog(registerData.volumeMappings, fog.uuid, transaction)

  if (registerData.ports) {
    await MicroservicePortService.validatePortMappings({ ports: registerData.ports, iofogUuid: fog.uuid }, transaction)
  }

  const validatedExtraHosts = registerData.extraHosts
    ? await WorkloadSpec.validateExtraHosts(registerData, fog.uuid, transaction)
    : undefined

  const existing = await MicroserviceManager.findOne({ uuid: registerData.uuid }, transaction)
  if (existing && existing.iofogUuid !== fog.uuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, registerData.uuid))
  }

  const application = await ensureSystemApplication(fog, transaction)

  if (existing) {
    await _updateControllerMicroservice(existing, registerData, fog, validatedExtraHosts, transaction)
  } else {
    await _createControllerMicroservice(registerData, fog, application, validatedExtraHosts, transaction)
  }

  return { uuid: registerData.uuid }
}

const bypassOptions = { bypassQueue: true }

module.exports = {
  registerControllerMicroservice: TransactionDecorator.generateTransaction(registerControllerMicroservice, bypassOptions)
}
