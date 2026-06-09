/* only "[a-zA-Z0-9][a-zA-Z0-9_.-]" are allowed
 * *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const TransactionDecorator = require('../decorators/transaction-decorator')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const MicroserviceArgManager = require('../data/managers/microservice-arg-manager')
const MicroserviceCdiDevManager = require('../data/managers/microservice-cdi-device-manager')
const MicroserviceCapAddManager = require('../data/managers/microservice-cap-add-manager')
const MicroserviceCapDropManager = require('../data/managers/microservice-cap-drop-manager')
const MicroserviceEnvManager = require('../data/managers/microservice-env-manager')
const MicroservicePortService = require('../services/microservice-ports/microservice-port')
const MicroserviceHealthCheckManager = require('../data/managers/microservice-healthcheck-manager')
const CatalogItemImageManager = require('../data/managers/catalog-item-image-manager')
const RegistryManager = require('../data/managers/registry-manager')
// const RouterManager = require('../data/managers/router-manager')
const MicroserviceStates = require('../enums/microservice-state')
const VolumeMappingManager = require('../data/managers/volume-mapping-manager')
const ChangeTrackingService = require('./change-tracking-service')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const { slugifyName } = require('../helpers/system-naming')
const Validator = require('../schemas/index')
const ApplicationManager = require('../data/managers/application-manager')
const CatalogService = require('../services/catalog-service')
const ServiceManager = require('../data/managers/service-manager')
const ServiceServices = require('./services-service')
const ConfigMapManager = require('../data/managers/config-map-manager')
const SecretManager = require('../data/managers/secret-manager')
const VolumeMountService = require('./volume-mount-service')
const RbacServiceAccountManager = require('../data/managers/rbac-service-account-manager')
const RbacRoleManager = require('../data/managers/rbac-role-manager')
const RbacCacheVersionManager = require('../data/managers/rbac-cache-version-manager')
const NatsAuthService = require('./nats-auth-service')
const NatsUserRuleManager = require('../data/managers/nats-user-rule-manager')

const Op = require('sequelize').Op
const FogManager = require('../data/managers/iofog-manager')
const MicroserviceExtraHostManager = require('../data/managers/microservice-extra-host-manager')
const { VOLUME_MAPPING_DEFAULT } = require('../helpers/constants')
const constants = require('../helpers/constants')
const isEqual = require('lodash/isEqual')
const logger = require('../logger')

/**
 * Create or update service account for a microservice
 * @param {string} microserviceUuid - UUID of the microservice
 * @param {string} microserviceName - Name of the microservice (used as service account name)
 * @param {string|null|undefined} roleRefName - Name of the role to reference (defaults to 'microservice' if not provided)
 * @param {Object} transaction - Database transaction
 * @returns {Object} Service account object
 */
async function _createOrUpdateServiceAccountForMicroservice (microserviceUuid, microserviceName, roleRefName, transaction) {
  const roleName = (roleRefName && typeof roleRefName === 'string' && roleRefName.trim() !== '') ? roleRefName : 'microservice'

  const role = await RbacRoleManager.getRoleWithRules(roleName, transaction)
  if (!role) {
    throw new Errors.ValidationError(`Referenced role '${roleName}' does not exist`)
  }

  const roleRef = {
    kind: 'Role',
    name: roleName
  }

  const existingServiceAccount = await RbacServiceAccountManager.findOneByMicroserviceUuid(microserviceUuid, transaction)

  if (existingServiceAccount) {
    await RbacServiceAccountManager.update({ id: existingServiceAccount.id }, { roleRef, name: microserviceName }, transaction)
    await RbacCacheVersionManager.incrementVersion(transaction)
    return RbacServiceAccountManager.findOne({ id: existingServiceAccount.id }, transaction)
  }

  const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
  if (!microservice || microservice.applicationId == null) {
    throw new Errors.ValidationError('Microservice or application not found for service account creation')
  }
  return RbacServiceAccountManager.createServiceAccount({
    microserviceUuid,
    applicationId: microservice.applicationId,
    name: microserviceName,
    roleRef
  }, transaction)
}

async function _ensureNatsCredsForMicroservice (microservice, transaction) {
  if (!microservice.iofogUuid) {
    return
  }

  const { account, user } = await NatsAuthService.ensureUserForMicroservice(microservice, transaction)
  const credsSecretName = user.credsSecretName

  try {
    await VolumeMountService.getVolumeMountEndpoint(credsSecretName, transaction)
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      throw err
    }
    await VolumeMountService.createVolumeMountEndpoint({ name: credsSecretName, secretName: credsSecretName }, transaction)
  }

  const linkedFogUuids = await VolumeMountService.findVolumeMountedFogNodes(credsSecretName, transaction)
  if (!linkedFogUuids.includes(microservice.iofogUuid)) {
    await VolumeMountService.linkVolumeMountEndpoint(credsSecretName, [microservice.iofogUuid], transaction)
  }
  const application = microservice.application || await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
  const accountName = application ? application.name : account.name
  const credsPath = `${slugifyName(accountName, 64)}/${slugifyName(microservice.name, 64)}.creds`
  const containerDest = `/etc/nats/creds`
  const existingMapping = await VolumeMappingManager.findOne({
    microserviceUuid: microservice.uuid,
    hostDestination: credsSecretName,
    containerDestination: containerDest,
    type: 'volumeMount'
  }, transaction)
  if (!existingMapping) {
    await VolumeMappingManager.create({
      microserviceUuid: microservice.uuid,
      hostDestination: credsSecretName,
      containerDestination: containerDest,
      accessMode: 'ro',
      type: 'volumeMount'
    }, transaction)
  }

  const existingCredsPathEnv = await MicroserviceEnvManager.findOne(
    { microserviceUuid: microservice.uuid, key: 'NATS_CREDS_PATH' },
    transaction
  )
  if (existingCredsPathEnv) {
    await MicroserviceEnvManager.update(
      { id: existingCredsPathEnv.id },
      { value: `${containerDest}/${credsPath}` },
      transaction
    )
  } else {
    await MicroserviceEnvManager.create(
      { microserviceUuid: microservice.uuid, key: 'NATS_CREDS_PATH', value: `${containerDest}/${credsPath}` },
      transaction
    )
  }

  await MicroserviceManager.update(
    { uuid: microservice.uuid },
    {
      natsAccess: true,
      natsAccountId: account.id,
      natsUserId: user.id,
      natsCredsSecretName: credsSecretName
    },
    transaction
  )
}

async function _detachNatsCredsForMicroservice (microservice, transaction) {
  if (!microservice.natsCredsSecretName) {
    return
  }

  await MicroserviceEnvManager.delete(
    { microserviceUuid: microservice.uuid, key: 'NATS_CREDS_PATH' },
    transaction
  )

  await VolumeMappingManager.delete({
    microserviceUuid: microservice.uuid,
    hostDestination: microservice.natsCredsSecretName,
    type: 'volumeMount'
  }, transaction)

  try {
    await VolumeMountService.unlinkVolumeMountEndpoint(microservice.natsCredsSecretName, [microservice.iofogUuid], transaction)
  } catch (err) {
    // Ignore missing volume mount or link errors
  }

  await MicroserviceManager.update(
    { uuid: microservice.uuid },
    {
      natsAccess: false,
      natsAccountId: null,
      natsUserId: null,
      natsCredsSecretName: null
    },
    transaction
  )
}

/**
 * Delete service account for a microservice
 * @param {string} microserviceUuid - UUID of the microservice
 * @param {Object} transaction - Database transaction
 */
async function _deleteServiceAccountForMicroservice (microserviceUuid, transaction) {
  try {
    await RbacServiceAccountManager.deleteByMicroserviceUuid(microserviceUuid, transaction)
  } catch (error) {
    if (error.name !== 'NotFoundError') {
      throw error
    }
    logger.warn(`Service account for microservice ${microserviceUuid} not found during deletion, continuing...`)
  }
}

async function listMicroservicesEndPoint (opt, isCLI, transaction) {
  // API retro compatibility
  const { applicationName, flowId } = opt
  let application = await _validateApplication(applicationName, isCLI, transaction)

  if (flowId) {
    // _validateApplication wil try by ID if it fails finding by name
    application = await _validateApplication(flowId, isCLI, transaction)
  }

  const where = application ? { applicationId: application.id, delete: false } : { delete: false, applicationId: { [Op.ne]: null } }

  const microservices = await MicroserviceManager.findAllExcludeFields(where, transaction)

  const res = await Promise.all(microservices.map(async (microservice) => {
    return _buildGetMicroserviceResponse(microservice.dataValues, transaction)
  }))

  return {
    microservices: res
  }
}

async function listSystemMicroservicesEndPoint (opt, isCLI, transaction) {
  const { applicationName, flowId } = opt
  let application = await _validateSystemApplication(applicationName, isCLI, transaction)

  if (flowId) {
    // _validateApplication wil try by ID if it fails finding by name
    application = await _validateSystemApplication(flowId, isCLI, transaction)
  }
  const where = application ? { applicationId: application.id, delete: false } : { delete: false, applicationId: { [Op.ne]: null } }

  const microservices = await MicroserviceManager.findAllSystemExcludeFields(where, transaction)
  const res = await Promise.all(microservices.map(async (microservice) => {
    return _buildGetMicroserviceResponse(microservice.dataValues, transaction)
  }))

  return {
    microservices: res
  }
}

async function getMicroserviceEndPoint (microserviceUuid, isCLI, transaction) {
  if (!isCLI) {
    await _validateMicroserviceOnGet(microserviceUuid, transaction)
  }

  const microservice = await MicroserviceManager.findOneExcludeFields({
    uuid: microserviceUuid, delete: false
  }, transaction)

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  return _buildGetMicroserviceResponse(microservice.dataValues, transaction)
}

async function getSystemMicroserviceEndPoint (microserviceUuid, isCLI, transaction) {
  if (!isCLI) {
    await _validateSystemMicroserviceOnGet(microserviceUuid, transaction)
  }

  const microservice = await MicroserviceManager.findOneExcludeFields({
    uuid: microserviceUuid, delete: false
  }, transaction)

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const app = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
  if (!app.isSystem) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  return _buildGetMicroserviceResponse(microservice.dataValues, transaction)
}

function _validateImagesAgainstCatalog (catalogItem, images) {
  const allImagesEmpty = images.reduce((result, b) => result && b.containerImage === '', true)
  if (allImagesEmpty) {
    return
  }
  for (const img of images) {
    let found = false
    for (const catalogImg of catalogItem.images) {
      if (catalogImg.fogType === img.fogType) {
        found = true
      }
      if (found === true && img.containerImage !== '' && catalogImg.containerImage !== img.containerImage) {
        throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.CATALOG_NOT_MATCH_IMAGES, `${catalogItem.id}`))
      }
    }
    if (!found) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.CATALOG_NOT_MATCH_IMAGES, `${catalogItem.id}`))
    }
  }
}

async function _validateLocalAppHostTemplate (extraHost, templateArgs, msvc, fogUuid, transaction) {
  if (templateArgs.length !== 4) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, templateArgs.join('.')))
  }
  const fog = await FogManager.findOne({ uuid: msvc.iofogUuid }, transaction)
  if (!fog) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_HOST_TEMPLATE, templateArgs[2]))
  }
  if (fogUuid !== fog.uuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_APPS_TEMPLATE, msvc.name))
  }

  extraHost.targetFogUuid = fog.uuid
  extraHost.value = `iofog_${msvc.uuid}`

  return extraHost
}

async function _validateAppHostTemplate (extraHost, templateArgs, fogUuid, transaction) {
  if (templateArgs.length < 4) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, templateArgs.join('.')))
  }
  const application = await ApplicationManager.findOne({ name: templateArgs[1] }, transaction)
  if (!application) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_HOST_TEMPLATE, templateArgs[1]))
  }
  const msvc = await MicroserviceManager.findOne({ applicationId: application.id, name: templateArgs[2] }, transaction)
  if (!msvc) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_HOST_TEMPLATE, templateArgs[2]))
  }
  extraHost.templateType = 'Apps'
  extraHost.targetMicroserviceUuid = msvc.uuid
  if (templateArgs[3] === 'local') {
    return _validateLocalAppHostTemplate(extraHost, templateArgs, msvc, fogUuid, transaction)
  }
  throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, templateArgs.join('.')))
}

async function _validateAgentHostTemplate (extraHost, templateArgs, transaction) {
  if (templateArgs.length !== 2) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, templateArgs.join('.')))
  }

  extraHost.templateType = 'Agents'
  const fog = await FogManager.findOne({ name: templateArgs[1] }, transaction)
  if (!fog) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_HOST_TEMPLATE, templateArgs[1]))
  }
  extraHost.targetFogUuid = fog.uuid
  extraHost.value = fog.host

  return extraHost
}

async function _validateExtraHost (extraHostData, fogUuid, transaction) {
  if (extraHostData.name === 'service.local') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, 'Extra Host name cannot be service.local'))
  }
  const extraHost = {
    templateType: 'Litteral',
    name: extraHostData.name,
    template: extraHostData.address,
    value: extraHostData.address
  }
  if (!(extraHost.template.startsWith('${') && extraHost.template.endsWith('}'))) {
    return extraHost
  }
  const template = extraHost.value.slice(2, extraHost.value.length - 1)
  const templateArgs = template.split('.')
  extraHost.templateType = templateArgs[0]
  if (templateArgs[0] === 'Apps') {
    return _validateAppHostTemplate(extraHost, templateArgs, fogUuid, transaction)
  } else if (templateArgs[0] === 'Agents') {
    return _validateAgentHostTemplate(extraHost, templateArgs, transaction)
  }
  throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, template))
}

async function _validateExtraHosts (microserviceData, fogUuid, transaction) {
  if (!microserviceData.extraHosts || microserviceData.extraHosts.length === 0) {
    return []
  }
  const extraHosts = []
  for (const extraHost of microserviceData.extraHosts) {
    extraHosts.push(await _validateExtraHost(extraHost, fogUuid, transaction))
  }
  return extraHosts
}

function _validateImageFogType (microserviceData, fog, images) {
  let found = false
  for (const image of images) {
    if (image.fogTypeId === fog.fogTypeId && image.containerImage) {
      found = true
      break
    }
  }
  if (!found) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MISSING_IMAGE, microserviceData.name))
  }
}

async function _findFog (microserviceData, isCLI, transaction) {
  const fogConditions = {}
  if (microserviceData.iofogUuid) {
    fogConditions.uuid = microserviceData.iofogUuid
  } else {
    fogConditions.name = microserviceData.agentName
  }
  return FogManager.findOne(fogConditions, transaction)
}

async function _normalizeMicroserviceNatsConfig (microserviceData, transaction, existingMicroservice = null) {
  if (Object.prototype.hasOwnProperty.call(microserviceData, 'natsAccess')) {
    throw new Errors.ValidationError('natsAccess must be provided under natsConfig.natsAccess')
  }
  const natsConfig = microserviceData.natsConfig || {}
  if (natsConfig.natsAccess !== undefined) {
    microserviceData.natsAccess = natsConfig.natsAccess
  } else if (existingMicroservice) {
    microserviceData.natsAccess = existingMicroservice.natsAccess
  }

  if (natsConfig.natsRule) {
    const rule = await NatsUserRuleManager.findOne({ name: natsConfig.natsRule }, transaction)
    if (!rule) {
      throw new Errors.ValidationError(`NATS user rule ${natsConfig.natsRule} does not exist`)
    }
    microserviceData.natsRuleId = rule.id
  } else if (existingMicroservice && !Object.prototype.hasOwnProperty.call(natsConfig, 'natsRule')) {
    microserviceData.natsRuleId = existingMicroservice.natsRuleId
  }

  if (microserviceData.natsAccess === false) {
    microserviceData.natsRuleId = null
  }
}

async function createMicroserviceEndPoint (microserviceData, isCLI, transaction) {
  // API Retro compatibility
  if (!microserviceData.application) {
    microserviceData.application = microserviceData.flowId
  }
  await _normalizeMicroserviceNatsConfig(microserviceData, transaction)
  await Validator.validate(microserviceData, Validator.schemas.microserviceCreate)

  // find fog
  const fog = await _findFog(microserviceData, isCLI, transaction)
  if (!fog) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, microserviceData.iofogUuid || microserviceData.agentName))
  }

  // Set fog uuid for further reference
  microserviceData.iofogUuid = fog.uuid

  // validate images
  if (microserviceData.catalogItemId) {
    // validate catalog item
    const catalogItem = await CatalogService.getCatalogItem(microserviceData.catalogItemId, isCLI, transaction)
    _validateImagesAgainstCatalog(catalogItem, microserviceData.images || [])
    microserviceData.images = catalogItem.images
    _validateImageFogType(microserviceData, fog, catalogItem.images)
    // use catalog item's registryId if it is set
    if (catalogItem.registryId) {
      microserviceData.registryId = catalogItem.registryId
    }
  } else {
    _validateImageFogType(microserviceData, fog, microserviceData.images)
  }

  if (!microserviceData.images || !microserviceData.images.length) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_DOES_NOT_HAVE_IMAGES, microserviceData.name))
  }

  // validate extraHosts
  const extraHosts = await _validateExtraHosts(microserviceData, fog.uuid, transaction)

  await MicroservicePortService.validatePortMappings(microserviceData, transaction)

  _validateVolumeMappings(microserviceData.volumeMappings)

  const microservice = await _createMicroservice({ ...microserviceData, iofogUuid: fog.uuid }, isCLI, transaction)

  if (!microserviceData.catalogItemId) {
    await _createMicroserviceImages(microservice, microserviceData.images, transaction)
  }

  // const publicPorts = []
  // const proxyPorts = []
  if (microserviceData.ports) {
    for (const mapping of microserviceData.ports) {
      // const res = await MicroservicePortService.createPortMapping(microservice, mapping, transaction)
      await MicroservicePortService.createPortMapping(microservice, mapping, transaction)
      // if (res) {
      //   if (res.publicLinks) {
      //     publicPorts.push({
      //       internal: mapping.internal,
      //       external: mapping.external,
      //       publicLinks: res.publicLinks
      //     })
      //   } else if (res.proxy) {
      //     proxyPorts.push({
      //       internal: mapping.internal,
      //       external: mapping.external,
      //       proxy: res.proxy
      //     })
      //   }
      // }
    }
  }

  for (const extraHost of extraHosts) {
    await _createExtraHost(microservice, extraHost, transaction)
  }

  if (microserviceData.env) {
    for (const env of microserviceData.env) {
      await _createEnv(microservice, env, transaction)
    }
  }
  if (microserviceData.cmd) {
    for (const arg of microserviceData.cmd) {
      await _createArg(microservice, arg, transaction)
    }
  }
  if (microserviceData.cdiDevices) {
    for (const cdiDevices of microserviceData.cdiDevices) {
      await _createCdiDevices(microservice, cdiDevices, transaction)
    }
  }
  if (microserviceData.healthCheck) {
    const healthCheckData = {
      microserviceUuid: microservice.uuid,
      ..._processHealthCheckForDB(microserviceData.healthCheck)
    }
    await MicroserviceHealthCheckManager.create(healthCheckData, transaction)
  }
  if (microserviceData.capAdd) {
    for (const capAdd of microserviceData.capAdd) {
      await _createCapAdd(microservice, capAdd, transaction)
    }
  }
  if (microserviceData.capDrop) {
    for (const capDrop of microserviceData.capDrop) {
      await _createCapDrop(microservice, capDrop, transaction)
    }
  }
  if (microserviceData.volumeMappings) {
    await _createVolumeMappings(microservice, microserviceData.volumeMappings, transaction)
  }

  if (microserviceData.iofogUuid) {
    await _updateChangeTracking(false, microserviceData.iofogUuid, transaction)
  }

  await _createMicroserviceStatus(microservice, transaction)
  await _createMicroserviceExecStatus(microservice, transaction)

  // Create service account for microservice (always create, use default 'microservice' role if not specified)
  let roleRefName = null
  if (microserviceData.serviceAccount &&
      microserviceData.serviceAccount.roleRef &&
      microserviceData.serviceAccount.roleRef.name) {
    roleRefName = microserviceData.serviceAccount.roleRef.name
  }
  try {
    await _createOrUpdateServiceAccountForMicroservice(microservice.uuid, microservice.name, roleRefName, transaction)
  } catch (error) {
    logger.error(`Failed to create service account for microservice ${microservice.name}:`, error.message)
    throw error
  }

  if (microserviceData.natsAccess) {
    const app = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
    if (!app || !app.natsAccess) {
      throw new Errors.ValidationError('Microservice natsAccess requires application natsAccess=true')
    }
    await _ensureNatsCredsForMicroservice(microservice, transaction)
  }

  const res = {
    uuid: microservice.uuid,
    name: microservice.name
  }
  // if (publicPorts.length) {
  //   res.publicPorts = publicPorts
  // }
  // if (proxyPorts.length) {
  //   res.proxies = proxyPorts
  // }

  return res
}

function _validateVolumeMappings (volumeMappings) {
  if (volumeMappings) {
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
}

function _validateKeyPath (data, keyPath, resourceName, resourceType, volumeMountName) {
  if (!keyPath || keyPath === '') {
    return true // No key path to validate
  }

  // ConfigMap and Secret keys are always flat - they're strings that can contain slashes
  // The key path can be:
  // 1. A full key name: "foo/bar/baz.conf" - maps to the file
  // 2. A prefix of a key: "foo" - maps to the directory containing keys starting with "foo/"
  // 3. A nested prefix: "foo/bar" - maps to the directory containing keys starting with "foo/bar/"
  //
  // For validation, we check if there's at least one key in the data that starts with the given keyPath
  // This allows mapping entire directories (prefixes) or specific files (exact match)

  // First, check for exact match (full file path)
  if (data[keyPath] !== undefined && data[keyPath] !== null) {
    return true // Exact key exists
  }

  // If no exact match, check if any key starts with the keyPath followed by '/'
  // This validates that the keyPath is a valid prefix for directory mapping
  // Handle trailing slash: if keyPath already ends with '/', use it as-is; otherwise add '/'
  const keyPathWithSlash = keyPath.endsWith('/') ? keyPath : keyPath + '/'
  const hasMatchingKey = Object.keys(data).some(key => key.startsWith(keyPathWithSlash))

  if (hasMatchingKey) {
    return true // Key path is a valid prefix for directory mapping
  }

  // No exact match and no keys with this prefix - key path is invalid
  if (resourceType === 'Secret') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SECRET_KEY_NOT_FOUND_IN_VOLUME_MOUNT, keyPath, resourceName, volumeMountName))
  } else {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_KEY_NOT_FOUND_IN_VOLUME_MOUNT, keyPath, resourceName, volumeMountName))
  }
}

/**
 * Validates a volume mount reference when type is 'volumeMount'
 * @param {string} hostDestination - Volume mount reference in format: <volume-mount-name>/<optional-key-path>
 * @param {string} type - Volume mapping type ('volume', 'bind', or 'volumeMount')
 * @param {string} fogUuid - UUID of the fog node
 * @param {object} transaction - Database transaction
 * @returns {Promise<void>}
 */
async function _validateVolumeMountReference (hostDestination, type, fogUuid, transaction) {
  if (!hostDestination || typeof hostDestination !== 'string') {
    return // No validation needed if hostDestination is empty or not a string
  }

  // Check if type is volumeMount - only validate when explicitly using volumeMount type
  if (type !== 'volumeMount') {
    return // Not a volume mount reference, skip validation
  }

  // Parse the volume mount reference: <volume-mount-name>/<optional-key-path>
  // Format: "my-volume-mount" or "my-volume-mount/config/app.conf"
  if (!hostDestination || hostDestination === '') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_VOLUME_MOUNT_REFERENCE_FOR_VOLUME_MAPPING, 'Volume mount reference must include a volume mount name'))
  }

  // Split by '/' to separate volume mount name and optional key path
  const parts = hostDestination.split('/')
  const volumeMountName = parts[0]
  const keyPath = parts.length > 1 ? parts.slice(1).join('/') : null

  if (!volumeMountName || volumeMountName === '') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_VOLUME_MOUNT_REFERENCE_FOR_VOLUME_MAPPING, 'Volume mount name cannot be empty'))
  }

  // Validate volume mount exists
  let volumeMount
  try {
    volumeMount = await VolumeMountService.getVolumeMountEndpoint(volumeMountName, transaction)
  } catch (error) {
    if (error instanceof Errors.NotFoundError) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.VOLUME_MOUNT_NOT_FOUND, volumeMountName))
    }
    throw error
  }

  // If key path is provided, validate it exists in the secret/configmap
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

  // Check if volume mount is linked to the fog node
  let linkedFogUuids
  try {
    linkedFogUuids = await VolumeMountService.findVolumeMountedFogNodes(volumeMountName, transaction)
  } catch (error) {
    // If volume mount doesn't exist (shouldn't happen at this point), rethrow
    throw error
  }

  // If fog node is not linked, link it
  if (!linkedFogUuids.includes(fogUuid)) {
    try {
      await VolumeMountService.linkVolumeMountEndpoint(volumeMountName, [fogUuid], transaction)
    } catch (error) {
      logger.error(`Failed to link volume mount ${volumeMountName} to fog node ${fogUuid}:`, error.message)
      throw new Errors.ValidationError(`Failed to link volume mount ${volumeMountName} to fog node: ${error.message}`)
    }
  }
}

async function _updateRelatedExtraHostTargetFog (extraHost, newFogUuid, transaction) {
  const fog = await FogManager.findOne({ uuid: newFogUuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, newFogUuid))
  }
  extraHost.targetFogUuid = fog.uuid
  extraHost.value = fog.host
  await extraHost.save()
  // Update tracking change for microservice
  await MicroserviceExtraHostManager.updateOriginMicroserviceChangeTracking(extraHost, transaction)
}

async function _updateRelatedExtraHosts (updatedMicroservice, transaction) {
  const extraHosts = await MicroserviceExtraHostManager.findAll({ targetMicroserviceUuid: updatedMicroservice.uuid }, transaction)
  for (const extraHost of extraHosts) {
    // if (!extraHost.publicPort) {
    //   // Local port, update target fog and host if microservice moved
    //   if (extraHost.targetFogUuid !== updatedMicroservice.iofogUuid) {
    //     await _updateRelatedExtraHostTargetFog(extraHost, updatedMicroservice.iofogUuid, transaction)
    //   }
    // }
    // Local port, update target fog and host if microservice moved
    if (extraHost.targetFogUuid !== updatedMicroservice.iofogUuid) {
      await _updateRelatedExtraHostTargetFog(extraHost, updatedMicroservice.iofogUuid, transaction)
    }
  }
}

async function updateSystemMicroserviceEndPoint (microserviceUuid, microserviceData, isCLI, transaction, changeTrackingEnabled = true) {
  await Validator.validate(microserviceData, Validator.schemas.microserviceUpdate)
  _validateMicroserviceSchedule(microserviceData.schedule, true)
  let needStatusReset = false
  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }

  const newFog = await _findFog(microserviceData, isCLI, transaction) || {}
  // validate extraHosts
  const extraHosts = microserviceData.extraHosts ? await _validateExtraHosts(microserviceData, newFog.uuid, transaction) : null

  const config = _validateMicroserviceConfig(microserviceData.config)

  const annotations = _validateMicroserviceAnnotations(microserviceData.annotations)

  // const newFog = await _findFog(microserviceData, isCLI, transaction) || {}
  const microserviceToUpdate = {
    name: microserviceData.name,
    config: config,
    annotations: annotations,
    images: microserviceData.images,
    catalogItemId: microserviceData.catalogItemId,
    rebuild: microserviceData.rebuild,
    iofogUuid: newFog.uuid,
    hostNetworkMode: microserviceData.hostNetworkMode,
    isPrivileged: microserviceData.isPrivileged,
    cpuSetCpus: microserviceData.cpuSetCpus,
    memoryLimit: microserviceData.memoryLimit,
    schedule: microserviceData.schedule,
    pidMode: microserviceData.pidMode,
    ipcMode: microserviceData.ipcMode,
    cdiDevices: microserviceData.cdiDevices,
    capAdd: microserviceData.capAdd,
    capDrop: microserviceData.capDrop,
    runAsUser: microserviceData.runAsUser,
    platform: microserviceData.platform,
    runtime: microserviceData.runtime,
    logSize: (microserviceData.logSize || constants.MICROSERVICE_DEFAULT_LOG_SIZE) * 1,
    registryId: microserviceData.registryId,
    volumeMappings: microserviceData.volumeMappings,
    env: microserviceData.env,
    cmd: microserviceData.cmd,
    ports: microserviceData.ports,
    healthCheck: microserviceData.healthCheck
  }

  const microserviceDataUpdate = AppHelper.deleteUndefinedFields(microserviceToUpdate)

  const microservice = await MicroserviceManager.findOneWithCategory(query, transaction)

  const microserviceImages = await CatalogItemImageManager.findAll({
    microservice_uuid: microserviceUuid
  }, transaction)

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (microserviceDataUpdate.name && microserviceDataUpdate.name !== microservice.name) {
    throw new Errors.ValidationError('Microservice Resource Name is immutable')
  }
  if (microserviceDataUpdate.registryId) {
    const registry = await RegistryManager.findOne({ id: microserviceDataUpdate.registryId }, transaction)
    if (!registry) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, microserviceDataUpdate.registryId))
    }
  } else {
    microserviceDataUpdate.registryId = microservice.registryId
  }

  if (microserviceDataUpdate.ports) {
    await _updateSystemPorts(microserviceDataUpdate.ports, microservice, transaction)
  }

  if (microserviceDataUpdate.iofogUuid && microservice.iofogUuid !== microserviceDataUpdate.iofogUuid) {
    // Moving to new agent
    // make sure all ports are available
    const ports = await microservice.getPorts()
    const data = {
      ports: [],
      iofogUuid: microserviceDataUpdate.iofogUuid
    }

    for (const port of ports) {
      data.ports.push({
        internal: port.portInternal,
        external: port.portExternal
      })
    }

    if (data.ports.length) {
      await MicroservicePortService.validatePortMappings(data, transaction)
    }
    needStatusReset = true
  }

  // Validate images vs catalog item

  const iofogUuid = microserviceDataUpdate.iofogUuid || microservice.iofogUuid
  if (microserviceDataUpdate.catalogItemId) {
    const catalogItem = await CatalogService.getSystemCatalogItem(microserviceDataUpdate.catalogItemId, isCLI, transaction)
    _validateImagesAgainstCatalog(catalogItem, microserviceDataUpdate.images || [])
    if (microserviceDataUpdate.catalogItemId !== undefined && microserviceDataUpdate.catalogItemId !== microservice.catalogItemId) {
      // Catalog item changed or removed, set rebuild flag
      microserviceDataUpdate.rebuild = true
      // If catalog item is set, set registry and msvc images
      if (microserviceDataUpdate.catalogItemId) {
        await _deleteImages(microserviceUuid, transaction)
        microserviceDataUpdate.registryId = catalogItem.registryId || 1
      }
    } else {
      // use catalog item's registryId if it is set
      if (catalogItem.registryId) {
        microserviceDataUpdate.registryId = catalogItem.registryId
      }
    }
  } else if (!microservice.catalogItemId && microserviceDataUpdate.images && microserviceDataUpdate.images.length === 0) {
    // No catalog, and no image
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_DOES_NOT_HAVE_IMAGES, microserviceData.name))
  } else if (microserviceDataUpdate.images && microserviceDataUpdate.images.length > 0 && !_checkIfMicroserviceImagesAreEqual(microserviceDataUpdate.images, microserviceImages)) {
    // No catalog, and images
    await _updateImages(microserviceDataUpdate.images, microserviceUuid, transaction)
    // Images updated, set rebuild flag to true
    microserviceDataUpdate.rebuild = true
  }

  if (microserviceDataUpdate.name) {
    await _checkForDuplicateName(microserviceDataUpdate.name, { id: microserviceUuid }, microservice.applicationId || microservice.application, transaction)
  }

  // validate fog node
  if (iofogUuid) {
    const fog = await FogManager.findOne({ uuid: iofogUuid }, transaction)
    if (!fog || fog.length === 0) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, iofogUuid))
    }

    // Validate image type
    let images = []
    if (microserviceDataUpdate.catalogItemId) {
      const catalogItem = await CatalogService.getSystemCatalogItem(microserviceDataUpdate.catalogItemId, isCLI, transaction)
      images = catalogItem.images
    } else if (microserviceDataUpdate.images) {
      images = microserviceDataUpdate.images
    } else if (microservice.catalogItemId) {
      const catalogItem = await CatalogService.getSystemCatalogItem(microservice.catalogItemId, isCLI, transaction)
      images = catalogItem.images
    } else {
      images = await microservice.getImages()
    }
    _validateImageFogType(microserviceData, fog, images)
  }

  // Set rebuild flag if needed
  microserviceDataUpdate.rebuild = microserviceDataUpdate.rebuild || !!(
    (microserviceDataUpdate.hostNetworkMode !== undefined && microservice.hostNetworkMode !== microserviceDataUpdate.hostNetworkMode) ||
    (microserviceDataUpdate.isPrivileged !== undefined && microservice.isPrivileged !== microserviceDataUpdate.isPrivileged) ||
    microserviceDataUpdate.pidMode ||
    microserviceDataUpdate.ipcMode ||
    microserviceDataUpdate.cpuSetCpus ||
    microserviceDataUpdate.memoryLimit ||
    microserviceDataUpdate.env ||
    microserviceDataUpdate.cmd ||
    microserviceDataUpdate.cdiDevices ||
    microserviceDataUpdate.annotations ||
    microserviceDataUpdate.capAdd ||
    microserviceDataUpdate.capDrop ||
    microserviceDataUpdate.runAsUser ||
    microserviceDataUpdate.platform ||
    microserviceDataUpdate.runtime ||
    microserviceDataUpdate.volumeMappings ||
    microserviceDataUpdate.ports ||
    (microserviceDataUpdate.schedule !== undefined && microserviceDataUpdate.schedule !== microservice.schedule) ||
    extraHosts
  )
  const updatedMicroservice = await MicroserviceManager.updateAndFind(query, microserviceDataUpdate, transaction)

  if (extraHosts) {
    await _updateExtraHosts(extraHosts, microserviceUuid, transaction)
  }

  // Update extra hosts that reference this microservice
  await _updateRelatedExtraHosts(updatedMicroservice, transaction)

  if (microserviceDataUpdate.volumeMappings) {
    await _updateVolumeMappings(microserviceDataUpdate.volumeMappings, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.env) {
    await _updateEnv(microserviceDataUpdate.env, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.cmd) {
    await _updateArg(microserviceDataUpdate.cmd, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.cdiDevices) {
    await _updateCdiDevices(microserviceDataUpdate.cdiDevices, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.capAdd) {
    await _updateCapAdd(microserviceDataUpdate.capAdd, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.healthCheck) {
    await MicroserviceHealthCheckManager.delete({
      microserviceUuid: microservice.uuid
    }, transaction)
    const healthCheckData = {
      microserviceUuid: microservice.uuid,
      ..._processHealthCheckForDB(microserviceDataUpdate.healthCheck)
    }
    if (healthCheckData.test && healthCheckData.test.length > 0) {
      await MicroserviceHealthCheckManager.create(healthCheckData, transaction)
    }
  }

  if (microserviceDataUpdate.capDrop) {
    await _updateCapDrop(microserviceDataUpdate.capDrop, microserviceUuid, transaction)
  }

  if (needStatusReset) {
    const microserviceStatus = {
      status: MicroserviceStates.QUEUED,
      operatingDuration: 0,
      startTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      containerId: '',
      percentage: 0,
      errorMessage: ''
    }
    await MicroserviceStatusManager.update({
      microserviceUuid: microservice.uuid
    }, microserviceStatus, transaction)
  }

  // Always ensure service account exists for microservice
  // If serviceAccount field is provided, use it; otherwise ensure default service account exists
  const microserviceName = updatedMicroservice.name || microservice.name
  let roleRefName = null

  if (microserviceData.serviceAccount !== undefined) {
    // Handle null, empty object, or valid roleRef
    if (microserviceData.serviceAccount &&
        microserviceData.serviceAccount.roleRef &&
        microserviceData.serviceAccount.roleRef.name) {
      roleRefName = microserviceData.serviceAccount.roleRef.name
    }
    // If serviceAccount is null or empty object, roleRefName will be null and default to 'microservice' role
  }
  // If serviceAccount field is not provided, roleRefName stays null and will default to 'microservice' role

  try {
    await _createOrUpdateServiceAccountForMicroservice(updatedMicroservice.uuid, microserviceName, roleRefName, transaction)
  } catch (error) {
    logger.error(`Failed to update service account for microservice ${microserviceName}:`, error.message)
    throw error
  }

  if (changeTrackingEnabled) {
    await _updateChangeTracking(true, microservice.iofogUuid, transaction)
    await _updateChangeTracking(true, updatedMicroservice.iofogUuid, transaction)
  } else {
    return {
      microserviceIofogUuid: microservice.iofogUuid,
      updatedMicroserviceIofogUuid: updatedMicroservice.iofogUuid
    }
  }
}

async function updateMicroserviceEndPoint (microserviceUuid, microserviceData, isCLI, transaction, changeTrackingEnabled = true) {
  const current = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
  await _normalizeMicroserviceNatsConfig(microserviceData, transaction, current)
  await Validator.validate(microserviceData, Validator.schemas.microserviceUpdate)
  let needStatusReset = false
  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }

  const newFog = await _findFog(microserviceData, isCLI, transaction) || {}
  // validate extraHosts
  const extraHosts = microserviceData.extraHosts ? await _validateExtraHosts(microserviceData, newFog.uuid, transaction) : null

  const config = _validateMicroserviceConfig(microserviceData.config)

  const annotations = _validateMicroserviceAnnotations(microserviceData.annotations)

  // const newFog = await _findFog(microserviceData, isCLI, transaction) || {}
  const microserviceToUpdate = {
    name: microserviceData.name,
    config: config,
    annotations: annotations,
    images: microserviceData.images,
    catalogItemId: microserviceData.catalogItemId,
    rebuild: microserviceData.rebuild,
    iofogUuid: newFog.uuid,
    hostNetworkMode: microserviceData.hostNetworkMode,
    isPrivileged: microserviceData.isPrivileged,
    cpuSetCpus: microserviceData.cpuSetCpus,
    memoryLimit: microserviceData.memoryLimit,
    schedule: microserviceData.schedule,
    pidMode: microserviceData.pidMode,
    ipcMode: microserviceData.ipcMode,
    cdiDevices: microserviceData.cdiDevices,
    capAdd: microserviceData.capAdd,
    capDrop: microserviceData.capDrop,
    runAsUser: microserviceData.runAsUser,
    platform: microserviceData.platform,
    runtime: microserviceData.runtime,
    logSize: (microserviceData.logSize || constants.MICROSERVICE_DEFAULT_LOG_SIZE) * 1,
    registryId: microserviceData.registryId,
    volumeMappings: microserviceData.volumeMappings,
    env: microserviceData.env,
    cmd: microserviceData.cmd,
    ports: microserviceData.ports,
    healthCheck: microserviceData.healthCheck,
    natsAccess: microserviceData.natsAccess,
    natsRuleId: microserviceData.natsRuleId
  }

  const microserviceDataUpdate = AppHelper.deleteUndefinedFields(microserviceToUpdate)

  const microservice = await MicroserviceManager.findOneWithCategory(query, transaction)

  const microserviceImages = await CatalogItemImageManager.findAll({
    microservice_uuid: microserviceUuid
  }, transaction)

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  const application = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
  if (microserviceDataUpdate.natsAccess === true && (!application || !application.natsAccess)) {
    throw new Errors.ValidationError('Microservice natsAccess requires application natsAccess=true')
  }
  if (microserviceDataUpdate.name && microserviceDataUpdate.name !== microservice.name) {
    throw new Errors.ValidationError('Microservice Resource Name is immutable')
  }
  if (microserviceDataUpdate.registryId) {
    const registry = await RegistryManager.findOne({ id: microserviceDataUpdate.registryId }, transaction)
    if (!registry) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, microserviceDataUpdate.registryId))
    }
  } else {
    microserviceDataUpdate.registryId = microservice.registryId
  }

  if (microserviceDataUpdate.ports) {
    await _updatePorts(microserviceDataUpdate.ports, microservice, transaction)
  }

  if (microserviceDataUpdate.iofogUuid && microservice.iofogUuid !== microserviceDataUpdate.iofogUuid) {
    // Moving to new agent
    // make sure all ports are available
    const ports = await microservice.getPorts()
    const data = {
      ports: [],
      iofogUuid: microserviceDataUpdate.iofogUuid
    }

    for (const port of ports) {
      data.ports.push({
        internal: port.portInternal,
        external: port.portExternal
      })
    }

    if (data.ports.length) {
      await MicroservicePortService.validatePortMappings(data, transaction)
    }
    needStatusReset = true
  }

  if (microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }

  _validateMicroserviceSchedule(microserviceDataUpdate.schedule, false)

  // Validate images vs catalog item

  const iofogUuid = microserviceDataUpdate.iofogUuid || microservice.iofogUuid
  if (microserviceDataUpdate.catalogItemId) {
    const catalogItem = await CatalogService.getCatalogItem(microserviceDataUpdate.catalogItemId, isCLI, transaction)
    _validateImagesAgainstCatalog(catalogItem, microserviceDataUpdate.images || [])
    if (microserviceDataUpdate.catalogItemId !== undefined && microserviceDataUpdate.catalogItemId !== microservice.catalogItemId) {
      // Catalog item changed or removed, set rebuild flag
      microserviceDataUpdate.rebuild = true
      // If catalog item is set, set registry and msvc images
      if (microserviceDataUpdate.catalogItemId) {
        await _deleteImages(microserviceUuid, transaction)
        microserviceDataUpdate.registryId = catalogItem.registryId || 1
      }
    } else {
      // use catalog item's registryId if it is set
      if (catalogItem.registryId) {
        microserviceDataUpdate.registryId = catalogItem.registryId
      }
    }
  } else if (!microservice.catalogItemId && microserviceDataUpdate.images && microserviceDataUpdate.images.length === 0) {
    // No catalog, and no image
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_DOES_NOT_HAVE_IMAGES, microserviceData.name))
  } else if (microserviceDataUpdate.images && microserviceDataUpdate.images.length > 0 && !_checkIfMicroserviceImagesAreEqual(microserviceDataUpdate.images, microserviceImages)) {
    // No catalog, and images
    await _updateImages(microserviceDataUpdate.images, microserviceUuid, transaction)
    // Images updated, set rebuild flag to true
    microserviceDataUpdate.rebuild = true
  }

  if (microserviceDataUpdate.name) {
    await _checkForDuplicateName(microserviceDataUpdate.name, { id: microserviceUuid }, microservice.applicationId || microservice.application, transaction)
  }

  // validate fog node
  if (iofogUuid) {
    const fog = await FogManager.findOne({ uuid: iofogUuid }, transaction)
    if (!fog || fog.length === 0) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, iofogUuid))
    }

    // Validate image type
    let images = []
    if (microserviceDataUpdate.catalogItemId) {
      const catalogItem = await CatalogService.getCatalogItem(microserviceDataUpdate.catalogItemId, isCLI, transaction)
      images = catalogItem.images
    } else if (microserviceDataUpdate.images) {
      images = microserviceDataUpdate.images
    } else if (microservice.catalogItemId) {
      const catalogItem = await CatalogService.getCatalogItem(microservice.catalogItemId, isCLI, transaction)
      images = catalogItem.images
    } else {
      images = await microservice.getImages()
    }
    _validateImageFogType(microserviceData, fog, images)
  }

  // Set rebuild flag if needed
  microserviceDataUpdate.rebuild = microserviceDataUpdate.rebuild || !!(
    (microserviceDataUpdate.hostNetworkMode !== undefined && microservice.hostNetworkMode !== microserviceDataUpdate.hostNetworkMode) ||
    (microserviceDataUpdate.isPrivileged !== undefined && microservice.isPrivileged !== microserviceDataUpdate.isPrivileged) ||
    microserviceDataUpdate.pidMode ||
    microserviceDataUpdate.ipcMode ||
    microserviceDataUpdate.cpuSetCpus ||
    microserviceDataUpdate.memoryLimit ||
    microserviceDataUpdate.env ||
    microserviceDataUpdate.cmd ||
    microserviceDataUpdate.cdiDevices ||
    microserviceDataUpdate.capAdd ||
    microserviceDataUpdate.capDrop ||
    microserviceDataUpdate.annotations ||
    microserviceDataUpdate.runAsUser ||
    microserviceDataUpdate.platform ||
    microserviceDataUpdate.runtime ||
    microserviceDataUpdate.volumeMappings ||
    microserviceDataUpdate.ports ||
    (microserviceDataUpdate.schedule !== undefined && microserviceDataUpdate.schedule !== microservice.schedule) ||
    extraHosts
  )
  const updatedMicroservice = await MicroserviceManager.updateAndFind(query, microserviceDataUpdate, transaction)

  if (extraHosts) {
    await _updateExtraHosts(extraHosts, microserviceUuid, transaction)
  }

  // Update extra hosts that reference this microservice
  await _updateRelatedExtraHosts(updatedMicroservice, transaction)

  if (microserviceDataUpdate.volumeMappings) {
    await _updateVolumeMappings(microserviceDataUpdate.volumeMappings, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.env) {
    await _updateEnv(microserviceDataUpdate.env, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.cmd) {
    await _updateArg(microserviceDataUpdate.cmd, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.cdiDevices) {
    await _updateCdiDevices(microserviceDataUpdate.cdiDevices, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.capAdd) {
    await _updateCapAdd(microserviceDataUpdate.capAdd, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.healthCheck) {
    await MicroserviceHealthCheckManager.delete({
      microserviceUuid: microservice.uuid
    }, transaction)
    const healthCheckData = {
      microserviceUuid: microservice.uuid,
      ..._processHealthCheckForDB(microserviceDataUpdate.healthCheck)
    }
    if (healthCheckData.test && healthCheckData.test.length > 0) {
      await MicroserviceHealthCheckManager.create(healthCheckData, transaction)
    }
  }

  if (microserviceDataUpdate.capDrop) {
    await _updateCapDrop(microserviceDataUpdate.capDrop, microserviceUuid, transaction)
  }

  const existingService = await ServiceManager.findOne({ type: `microservice`, resource: microservice.uuid }, transaction)
  if (microserviceDataUpdate.iofogUuid && microserviceDataUpdate.iofogUuid !== microservice.iofogUuid && existingService) {
    await ServiceServices.moveMicroserviceTcpBridgeToNewFog(existingService, microserviceDataUpdate.iofogUuid, microservice.iofogUuid, transaction)
  }

  // Update tags
  if (needStatusReset) {
    const microserviceStatus = {
      status: MicroserviceStates.QUEUED,
      operatingDuration: 0,
      startTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      containerId: '',
      percentage: 0,
      errorMessage: ''
    }
    await MicroserviceStatusManager.update({
      microserviceUuid: microservice.uuid
    }, microserviceStatus, transaction)
  }

  // Always ensure service account exists for microservice
  // If serviceAccount field is provided, use it; otherwise ensure default service account exists
  const microserviceName = updatedMicroservice.name || microservice.name
  let roleRefName = null

  if (microserviceData.serviceAccount !== undefined) {
    // Handle null, empty object, or valid roleRef
    if (microserviceData.serviceAccount &&
        microserviceData.serviceAccount.roleRef &&
        microserviceData.serviceAccount.roleRef.name) {
      roleRefName = microserviceData.serviceAccount.roleRef.name
    }
    // If serviceAccount is null or empty object, roleRefName will be null and default to 'microservice' role
  }
  // If serviceAccount field is not provided, roleRefName stays null and will default to 'microservice' role

  try {
    await _createOrUpdateServiceAccountForMicroservice(updatedMicroservice.uuid, microserviceName, roleRefName, transaction)
  } catch (error) {
    logger.error(`Failed to update service account for system microservice ${microserviceName}:`, error.message)
    throw error
  }

  const shouldEnableNats = microserviceData.natsAccess === true
  const shouldDisableNats = microserviceData.natsAccess === false && microservice.natsAccess
  const natsRuleChanged = Object.prototype.hasOwnProperty.call(microserviceData, 'natsRuleId') &&
    microserviceData.natsRuleId !== microservice.natsRuleId

  if (shouldEnableNats) {
    if (natsRuleChanged) {
      await NatsAuthService.reissueUserForMicroservice(updatedMicroservice.uuid, transaction)
    }
    await _ensureNatsCredsForMicroservice(updatedMicroservice, transaction)
  } else if (shouldDisableNats) {
    await _detachNatsCredsForMicroservice(microservice, transaction)
    await NatsAuthService.revokeMicroserviceUser(microservice.uuid, transaction)
  }

  if (changeTrackingEnabled) {
    await _updateChangeTracking(true, microservice.iofogUuid, transaction)
    await _updateChangeTracking(true, updatedMicroservice.iofogUuid, transaction)
  } else {
    return {
      microserviceIofogUuid: microservice.iofogUuid,
      updatedMicroserviceIofogUuid: updatedMicroservice.iofogUuid
    }
  }
}

async function updateMicroserviceConfigEndPoint (microserviceUuid, config, isCLI, transaction) {
  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }
  const microservice = await MicroserviceManager.findOneWithCategory(query, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }
  const microserviceConfig = _validateMicroserviceConfig(JSON.stringify(config))
  await MicroserviceManager.update(query, { config: microserviceConfig }, transaction)
  const iofogUuid = microservice.iofogUuid
  await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
  return {
    uuid: microserviceUuid
  }
}

async function getMicroserviceConfigEndPoint (microserviceUuid, isCLI, transaction) {
  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }
  const microservice = await MicroserviceManager.findOneWithCategory(query, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  if (microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }
  const microserviceConfig = JSON.parse(microservice.config)
  return {
    config: microserviceConfig
  }
}

async function deleteMicroserviceConfigEndPoint (microserviceUuid, isCLI, transaction) {
  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }
  const microservice = await MicroserviceManager.findOneWithCategory(query, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }
  const microserviceConfig = {}
  await MicroserviceManager.update(query, { config: JSON.stringify(microserviceConfig) }, transaction)
  const iofogUuid = microservice.iofogUuid
  await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
  return {
    uuid: microserviceUuid
  }
}

async function getSystemMicroserviceConfigEndPoint (microserviceUuid, isCLI, transaction) {
  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }
  const microservice = await MicroserviceManager.findOneWithCategory(query, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (!microservice.catalogItem || microservice.catalogItem.category !== 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }
  const microserviceConfig = JSON.parse(microservice.config)
  return {
    config: microserviceConfig
  }
}

async function updateSystemMicroserviceConfigEndPoint (microserviceUuid, config, isCLI, transaction) {
  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }
  const microservice = await MicroserviceManager.findOneWithCategory(query, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (!microservice.catalogItem || microservice.catalogItem.category !== 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }
  const microserviceConfig = _validateMicroserviceConfig(JSON.stringify(config))
  await MicroserviceManager.update(query, { config: microserviceConfig }, transaction)
  const iofogUuid = microservice.iofogUuid
  await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
  return {
    uuid: microserviceUuid
  }
}

async function deleteSystemMicroserviceConfigEndPoint (microserviceUuid, isCLI, transaction) {
  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }
  const microservice = await MicroserviceManager.findOneWithCategory(query, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (!microservice.catalogItem || microservice.catalogItem.category !== 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }
  const microserviceConfig = {}
  await MicroserviceManager.update(query, { config: JSON.stringify(microserviceConfig) }, transaction)
  const iofogUuid = microservice.iofogUuid
  await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
  return {
    uuid: microserviceUuid
  }
}

async function rebuildMicroserviceEndPoint (microserviceUuid, isCLI, transaction) {
  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }

  const check = await MicroserviceManager.findOneWithCategory(query, transaction)
  if (check.catalogItem && check.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }

  const microservice = await MicroserviceManager.updateAndFind(query, { rebuild: true }, transaction)

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  const iofogUuid = microservice.iofogUuid
  await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  return {
    uuid: microserviceUuid,
    rebuild: true
  }
}

async function rebuildSystemMicroserviceEndPoint (microserviceUuid, isCLI, transaction) {
  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }

  const microservice = await MicroserviceManager.updateAndFind(query, { rebuild: true }, transaction)

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  const iofogUuid = microservice.iofogUuid
  await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  return {
    uuid: microserviceUuid,
    rebuild: true
  }
}

/**
 * checks if microservice image is updated
 * @param {*} microserviceDataUpdateImages
 * @param {*} catalogImages
 */
const _checkIfMicroserviceImagesAreEqual = (microserviceDataUpdateImages, catalogImages) => {
  const oldMicroservicesImages = []
  for (const images of catalogImages) {
    oldMicroservicesImages.push(images.containerImage)
  }
  const newMicroserviceImages = []
  for (const images of microserviceDataUpdateImages) {
    newMicroserviceImages.push(images.containerImage)
  }
  return isEqual(newMicroserviceImages, oldMicroservicesImages)
}

async function deleteMicroserviceEndPoint (microserviceUuid, microserviceData, isCLI, transaction) {
  const where = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }

  const microservice = await MicroserviceManager.findOneWithStatusAndCategory(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (!isCLI && microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_DELETE, microserviceUuid))
  }

  const existingService = await ServiceManager.findOne({ type: `microservice`, resource: microservice.uuid }, transaction)
  if (existingService) {
    logger.info(`Deleting service ${existingService.name}`)
    await ServiceServices.deleteServiceEndpoint(existingService.name, transaction)
  }

  // Delete service account for microservice
  await _deleteServiceAccountForMicroservice(microservice.uuid, transaction)

  await deleteMicroserviceWithRoutesAndPortMappings(microservice, transaction)
  await _updateChangeTracking(false, microservice.iofogUuid, transaction)
}

async function deleteNotRunningMicroservices (fog, transaction) {
  const microservices = await MicroserviceManager.findAllWithStatuses({ iofogUuid: fog.uuid }, transaction)
  microservices
    .filter((microservice) => microservice.delete)
    .filter((microservice) => microservice.microserviceStatus.status === MicroserviceStates.UNKNOWN ||
      microservice.microserviceStatus.status === MicroserviceStates.STOPPING ||
      microservice.microserviceStatus.status === MicroserviceStates.DELETING ||
      microservice.microserviceStatus.status === MicroserviceStates.MARKED_FOR_DELETION)
    .forEach(async (microservice) => { await deleteMicroserviceWithRoutesAndPortMappings(microservice, transaction) })
}

async function createPortMappingEndPoint (microserviceUuid, portMappingData, isCLI, transaction) {
  await Validator.validate(portMappingData, Validator.schemas.portsCreate)
  await _validateMicroserviceOnGet(microserviceUuid, transaction)
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const agent = await FogManager.findOne({ uuid: microservice.iofogUuid }, transaction)
  if (!agent) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, microservice.iofogUuid))
  }
  await MicroservicePortService.validatePortMapping(agent, portMappingData, {}, transaction)

  return MicroservicePortService.createPortMapping(microservice, portMappingData, transaction)
}

async function createSystemPortMappingEndPoint (microserviceUuid, portMappingData, isCLI, transaction) {
  await Validator.validate(portMappingData, Validator.schemas.portsCreate)

  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const agent = await FogManager.findOne({ uuid: microservice.iofogUuid }, transaction)
  if (!agent) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, microservice.iofogUuid))
  }
  await MicroservicePortService.validatePortMapping(agent, portMappingData, {}, transaction)

  return MicroservicePortService.createPortMapping(microservice, portMappingData, transaction)
}

async function _createExtraHost (microservice, extraHostData, transaction) {
  const msExtraHostData = {
    ...extraHostData,
    microserviceUuid: microservice.uuid
  }

  await MicroserviceExtraHostManager.create(msExtraHostData, transaction)
}

async function _createEnv (microservice, envData, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msEnvData = {
    key: envData.key,
    value: envData.value,
    microserviceUuid: microservice.uuid
  }

  // Handle valueFromSecret
  if (envData.valueFromSecret) {
    const [secretName, dataKey] = envData.valueFromSecret.split('/')
    if (!secretName || !dataKey) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_SECRET_REFERENCE, envData.valueFromSecret))
    }
    const secret = await SecretManager.getSecret(secretName, transaction)
    if (!secret) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, secretName))
    }
    if (!secret.data[dataKey]) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SECRET_KEY_NOT_FOUND, dataKey, secretName))
    }
    // If it's a TLS secret, decode the base64 value
    if (secret.type === 'tls') {
      try {
        msEnvData.value = Buffer.from(secret.data[dataKey], 'base64').toString('utf-8')
      } catch (error) {
        throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_BASE64_VALUE, dataKey, secretName))
      }
    } else {
      msEnvData.value = secret.data[dataKey]
    }
    msEnvData.valueFromSecret = envData.valueFromSecret
  }

  // Handle valueFromConfigMap
  if (envData.valueFromConfigMap) {
    const [configMapName, dataKey] = envData.valueFromConfigMap.split('/')
    if (!configMapName || !dataKey) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_CONFIGMAP_REFERENCE, envData.valueFromConfigMap))
    }
    const configMap = await ConfigMapManager.getConfigMap(configMapName, transaction)
    if (!configMap) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_NOT_FOUND, configMapName))
    }
    if (!configMap.data[dataKey]) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_KEY_NOT_FOUND, dataKey, configMapName))
    }
    msEnvData.value = configMap.data[dataKey]
    msEnvData.valueFromConfigMap = envData.valueFromConfigMap
  }

  await MicroserviceEnvManager.create(msEnvData, transaction)
  await MicroservicePortService.switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, transaction)
}

async function _createArg (microservice, arg, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msArgData = {
    cmd: arg,
    microserviceUuid: microservice.uuid
  }

  await MicroserviceArgManager.create(msArgData, transaction)
  await MicroservicePortService.switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, transaction)
}

async function _createCdiDevices (microservice, cdiDevices, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msCdiDevicesData = {
    cdiDevices: cdiDevices,
    microserviceUuid: microservice.uuid
  }

  await MicroserviceCdiDevManager.create(msCdiDevicesData, transaction)
  await MicroservicePortService.switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, transaction)
}

async function _createCapAdd (microservice, capAdd, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msCapAddData = {
    capAdd: capAdd,
    microserviceUuid: microservice.uuid
  }

  await MicroserviceCapAddManager.create(msCapAddData, transaction)
  await MicroservicePortService.switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, transaction)
}

async function _createCapDrop (microservice, capDrop, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msCapDropData = {
    capDrop: capDrop,
    microserviceUuid: microservice.uuid
  }

  await MicroserviceCapDropManager.create(msCapDropData, transaction)
  await MicroservicePortService.switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, transaction)
}

async function deletePortMappingEndPoint (microserviceUuid, internalPort, isCLI, transaction) {
  return MicroservicePortService.deletePortMapping(microserviceUuid, internalPort, isCLI, transaction)
}

async function deleteSystemPortMappingEndPoint (microserviceUuid, internalPort, isCLI, transaction) {
  return MicroservicePortService.deleteSystemPortMapping(microserviceUuid, internalPort, isCLI, transaction)
}

async function listPortMappingsEndPoint (microserviceUuid, isCLI, transaction) {
  return MicroservicePortService.listPortMappings(microserviceUuid, isCLI, transaction)
}

async function isMicroserviceRouter (microservice, transaction) {
  if (microservice.name !== 'router') {
    return false
  }
  const app = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
  return !!(app && app.isSystem === true)
}

async function isMicroserviceNats (microservice, transaction) {
  if (microservice.name !== 'nats') {
    return false
  }
  const app = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
  return !!(app && app.isSystem === true)
}

async function createVolumeMappingEndPoint (microserviceUuid, volumeMappingData, isCLI, transaction) {
  await Validator.validate(volumeMappingData, Validator.schemas.volumeMappings)

  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid }

  const microservice = await MicroserviceManager.findMicroserviceOnGet(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const type = volumeMappingData.type || VOLUME_MAPPING_DEFAULT

  const volumeMapping = await VolumeMappingManager.findOne({
    microserviceUuid: microserviceUuid,
    hostDestination: volumeMappingData.hostDestination,
    containerDestination: volumeMappingData.containerDestination,
    type
  }, transaction)
  if (volumeMapping) {
    throw new Errors.ValidationError(ErrorMessages.VOLUME_MAPPING_ALREADY_EXISTS)
  }

  _validateVolumeMappings([volumeMappingData])

  // Validate volume mount references before creating mapping
  // When type is 'volumeMount', validates that the volume mount exists and is linked to the fog node
  if (volumeMappingData.hostDestination && microservice.iofogUuid) {
    await _validateVolumeMountReference(volumeMappingData.hostDestination, type, microservice.iofogUuid, transaction)
  }

  const volumeMappingObj = {
    microserviceUuid: microserviceUuid,
    hostDestination: volumeMappingData.hostDestination,
    containerDestination: volumeMappingData.containerDestination,
    accessMode: volumeMappingData.accessMode,
    type
  }

  return VolumeMappingManager.create(volumeMappingObj, transaction)
}

async function createSystemVolumeMappingEndPoint (microserviceUuid, volumeMappingData, isCLI, transaction) {
  await Validator.validate(volumeMappingData, Validator.schemas.volumeMappings)

  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const type = volumeMappingData.type || VOLUME_MAPPING_DEFAULT

  const volumeMapping = await VolumeMappingManager.findOne({
    microserviceUuid: microserviceUuid,
    hostDestination: volumeMappingData.hostDestination,
    containerDestination: volumeMappingData.containerDestination,
    type
  }, transaction)
  if (volumeMapping) {
    throw new Errors.ValidationError(ErrorMessages.VOLUME_MAPPING_ALREADY_EXISTS)
  }

  _validateVolumeMappings([volumeMappingData])

  // Validate volume mount references before creating mapping
  // When type is 'volumeMount', validates that the volume mount exists and is linked to the fog node
  if (volumeMappingData.hostDestination && microservice.iofogUuid) {
    await _validateVolumeMountReference(volumeMappingData.hostDestination, type, microservice.iofogUuid, transaction)
  }

  const volumeMappingObj = {
    microserviceUuid: microserviceUuid,
    hostDestination: volumeMappingData.hostDestination,
    containerDestination: volumeMappingData.containerDestination,
    accessMode: volumeMappingData.accessMode,
    type
  }

  return VolumeMappingManager.create(volumeMappingObj, transaction)
}

async function deleteVolumeMappingEndPoint (microserviceUuid, volumeMappingUuid, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volumeMappingWhere = {
    uuid: volumeMappingUuid,
    microserviceUuid: microserviceUuid
  }

  const affectedRows = await VolumeMappingManager.delete(volumeMappingWhere, transaction)
  if (affectedRows === 0) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_VOLUME_MAPPING_UUID, volumeMappingUuid))
  }
}

async function deleteSystemVolumeMappingEndPoint (microserviceUuid, volumeMappingUuid, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volumeMappingWhere = {
    uuid: volumeMappingUuid,
    microserviceUuid: microserviceUuid
  }

  const affectedRows = await VolumeMappingManager.delete(volumeMappingWhere, transaction)
  if (affectedRows === 0) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_VOLUME_MAPPING_UUID, volumeMappingUuid))
  }
}

async function listVolumeMappingsEndPoint (microserviceUuid, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid }
  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volumeMappingWhere = {
    microserviceUuid: microserviceUuid
  }
  return VolumeMappingManager.findAll(volumeMappingWhere, transaction)
}

// this function works with escape and unescape config, in case of unescaped config, the first split will not work,
// but the second will work
function _validateMicroserviceConfig (config) {
  let result
  if (config) {
    result = config.split('\\"').join('"').split('"').join('\"') // eslint-disable-line no-useless-escape
  }
  return result
}

function _validateMicroserviceAnnotations (annotations) {
  let result
  if (annotations) {
    result = annotations.split('\\"').join('"').split('"').join('\"') // eslint-disable-line no-useless-escape
  }
  return result
}

function _validateMicroserviceSchedule (schedule, isSystem) {
  if (schedule === undefined || schedule === null) {
    return
  }
  if (!Number.isInteger(schedule)) {
    throw new Errors.ValidationError('Microservice schedule must be an integer')
  }
  if (isSystem) {
    if (schedule < 0 || schedule > 5) {
      throw new Errors.ValidationError('System microservice schedule must be between 0 and 5')
    }
    return
  }
  if (schedule < 6 || schedule > 100) {
    throw new Errors.ValidationError('Microservice schedule must be between 6 and 100')
  }
}

function _validateMicroserviceHealthCheck (healthCheck) {
  let result
  if (healthCheck) {
    // Convert the health check object to a JSON string for database storage
    result = JSON.stringify(healthCheck)
  }
  return result
}

function _processHealthCheckForDB (healthCheckData) {
  if (!healthCheckData) return null

  return {
    test: _validateMicroserviceHealthCheck(healthCheckData.test),
    interval: healthCheckData.interval,
    timeout: healthCheckData.timeout,
    startPeriod: healthCheckData.startPeriod,
    startInterval: healthCheckData.startInterval,
    retries: healthCheckData.retries
  }
}

async function _createMicroservice (microserviceData, isCLI, transaction) {
  const config = _validateMicroserviceConfig(microserviceData.config)
  const annotations = _validateMicroserviceAnnotations(microserviceData.annotations)

  let newMicroservice = {
    uuid: AppHelper.generateUUID(),
    name: microserviceData.name,
    config: config,
    annotations: annotations,
    catalogItemId: microserviceData.catalogItemId,
    iofogUuid: microserviceData.iofogUuid,
    hostNetworkMode: microserviceData.hostNetworkMode,
    isPrivileged: microserviceData.isPrivileged,
    cpuSetCpus: microserviceData.cpuSetCpus,
    memoryLimit: microserviceData.memoryLimit,
    pidMode: microserviceData.pidMode,
    ipcMode: microserviceData.ipcMode,
    cdiDevices: microserviceData.cdiDevices,
    capAdd: microserviceData.capAdd,
    capDrop: microserviceData.capDrop,
    runAsUser: microserviceData.runAsUser,
    platform: microserviceData.platform,
    runtime: microserviceData.runtime,
    registryId: microserviceData.registryId || 1,
    schedule: microserviceData.schedule || 50,
    logSize: (microserviceData.logSize || constants.MICROSERVICE_DEFAULT_LOG_SIZE) * 1,
    natsAccess: !!microserviceData.natsAccess,
    natsRuleId: microserviceData.natsRuleId
  }

  newMicroservice = AppHelper.deleteUndefinedFields(newMicroservice)

  if (newMicroservice.registryId) {
    const registry = await RegistryManager.findOne({ id: newMicroservice.registryId }, transaction)
    if (!registry) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, newMicroservice.registryId))
    }
  }

  // validate application
  const application = await _validateApplication(microserviceData.application, isCLI, transaction)
  newMicroservice.applicationId = application.id
  if (newMicroservice.natsAccess && !application.natsAccess) {
    throw new Errors.ValidationError('Microservice natsAccess requires application natsAccess=true')
  }

  await _checkForDuplicateName(newMicroservice.name, {}, newMicroservice.applicationId, transaction)

  // validate fog node
  if (newMicroservice.iofogUuid) {
    const fog = await FogManager.findOne({ uuid: newMicroservice.iofogUuid }, transaction)
    if (!fog || fog.length === 0) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, newMicroservice.iofogUuid))
    }
  }

  return MicroserviceManager.create(newMicroservice, transaction)
}

async function _validateApplication (name, isCLI, transaction) {
  if (!name) {
    return null
  }

  // Force name conversion to string for PG
  const where = isCLI
    ? { name: name.toString(), isSystem: false }
    : { name: name.toString(), isSystem: false }

  const application = await ApplicationManager.findOne(where, transaction)
  if (!application) {
    // Try with id - but only if name is actually a valid integer
    if (Number.isInteger(Number(name)) && !isNaN(name)) {
      const where = isCLI
        ? { id: parseInt(name), isSystem: false }
        : { id: parseInt(name), isSystem: false }

      const application = await ApplicationManager.findOne(where, transaction)
      if (!application) {
        throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, name))
      }
      return application
    } else {
      // If name is not a valid integer, it's not a valid ID either
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, name))
    }
  }
  return application
}

async function _validateSystemApplication (name, isCLI, transaction) {
  if (!name) {
    return null
  }

  // Force name conversion to string for PG
  const where = isCLI
    ? { name: name.toString(), isSystem: true }
    : { name: name.toString(), isSystem: true }

  const application = await ApplicationManager.findOne(where, transaction)
  if (!application) {
    // Try with id - but only if name is actually a valid integer
    if (Number.isInteger(Number(name)) && !isNaN(name)) {
      const where = isCLI
        ? { id: parseInt(name), isSystem: true }
        : { id: parseInt(name), isSystem: true }

      const application = await ApplicationManager.findOne(where, transaction)
      if (!application) {
        throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, name))
      }
      return application
    } else {
      // If name is not a valid integer, it's not a valid ID either
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, name))
    }
  }
  return application
}

async function _createMicroserviceStatus (microservice, transaction) {
  return MicroserviceStatusManager.create({
    microserviceUuid: microservice.uuid
  }, transaction)
}

async function _createMicroserviceExecStatus (microservice, transaction) {
  return MicroserviceExecStatusManager.create({
    microserviceUuid: microservice.uuid
  }, transaction)
}

async function _createMicroserviceImages (microservice, images, transaction) {
  const newImages = []
  for (const img of images) {
    const newImg = Object.assign({}, img)
    newImg.microserviceUuid = microservice.uuid
    newImages.push(newImg)
  }
  return CatalogItemImageManager.bulkCreate(newImages, transaction)
}

async function _createVolumeMappings (microservice, volumeMappings, transaction) {
  // Validate volume mount references before creating mappings
  // When type is 'volumeMount', validates that the volume mount exists and is linked to the fog node
  if (volumeMappings && microservice.iofogUuid) {
    for (const volumeMapping of volumeMappings) {
      if (volumeMapping.hostDestination) {
        const type = volumeMapping.type || VOLUME_MAPPING_DEFAULT
        await _validateVolumeMountReference(volumeMapping.hostDestination, type, microservice.iofogUuid, transaction)
      }
    }
  }

  const mappings = []
  for (const volumeMapping of volumeMappings) {
    const mapping = Object.assign({}, volumeMapping)
    mapping.microserviceUuid = microservice.uuid
    mappings.push(mapping)
  }

  await VolumeMappingManager.bulkCreate(mappings, transaction)
}

async function _updateVolumeMappings (volumeMappings, microserviceUuid, transaction) {
  _validateVolumeMappings(volumeMappings)

  // Get microservice to find fogUuid for volume mount validation
  const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  // Validate volume mount references before updating mappings
  // When type is 'volumeMount', validates that the volume mount exists and is linked to the fog node
  if (volumeMappings && microservice.iofogUuid) {
    for (const volumeMapping of volumeMappings) {
      if (volumeMapping.hostDestination) {
        const type = volumeMapping.type || VOLUME_MAPPING_DEFAULT
        await _validateVolumeMountReference(volumeMapping.hostDestination, type, microservice.iofogUuid, transaction)
      }
    }
  }

  await VolumeMappingManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)

  for (const volumeMapping of volumeMappings) {
    const type = volumeMapping.type || VOLUME_MAPPING_DEFAULT
    const volumeMappingObj = {
      microserviceUuid: microserviceUuid,
      hostDestination: volumeMapping.hostDestination,
      containerDestination: volumeMapping.containerDestination,
      accessMode: volumeMapping.accessMode,
      type
    }

    await VolumeMappingManager.create(volumeMappingObj, transaction)
  }
}

async function _updateImages (images, microserviceUuid, transaction) {
  await CatalogItemImageManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  return _createMicroserviceImages({ uuid: microserviceUuid }, images, transaction)
}

async function _deleteImages (microserviceUuid, transaction) {
  await CatalogItemImageManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
}

async function _updateExtraHosts (extraHosts, microserviceUuid, transaction) {
  await MicroserviceExtraHostManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  for (const extraHost of extraHosts) {
    await _createExtraHost({ uuid: microserviceUuid }, extraHost, transaction)
  }
}

async function _updateEnv (env, microserviceUuid, transaction) {
  await MicroserviceEnvManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  for (const envData of env) {
    const envObj = {
      microserviceUuid: microserviceUuid,
      key: envData.key,
      value: envData.value
    }

    // Handle valueFromSecret
    if (envData.valueFromSecret) {
      const [secretName, dataKey] = envData.valueFromSecret.split('/')
      if (!secretName || !dataKey) {
        throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_SECRET_REFERENCE, envData.valueFromSecret))
      }
      const secret = await SecretManager.getSecret(secretName, transaction)
      if (!secret) {
        throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, secretName))
      }
      if (!secret.data[dataKey]) {
        throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SECRET_KEY_NOT_FOUND, dataKey, secretName))
      }
      // If it's a TLS secret, decode the base64 value
      if (secret.type === 'tls') {
        try {
          envObj.value = Buffer.from(secret.data[dataKey], 'base64').toString('utf-8')
        } catch (error) {
          throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_BASE64_VALUE, dataKey, secretName))
        }
      } else {
        envObj.value = secret.data[dataKey]
      }
      envObj.valueFromSecret = envData.valueFromSecret
    }

    // Handle valueFromConfigMap
    if (envData.valueFromConfigMap) {
      const [configMapName, dataKey] = envData.valueFromConfigMap.split('/')
      if (!configMapName || !dataKey) {
        throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_CONFIGMAP_REFERENCE, envData.valueFromConfigMap))
      }
      const configMap = await ConfigMapManager.getConfigMap(configMapName, transaction)
      if (!configMap) {
        throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_NOT_FOUND, configMapName))
      }
      if (!configMap.data[dataKey]) {
        throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_KEY_NOT_FOUND, dataKey, configMapName))
      }
      envObj.value = configMap.data[dataKey]
      envObj.valueFromConfigMap = envData.valueFromConfigMap
    }

    await MicroserviceEnvManager.create(envObj, transaction)
  }
}

async function _updateArg (arg, microserviceUuid, transaction) {
  await MicroserviceArgManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  for (const argData of arg) {
    const envObj = {
      microserviceUuid: microserviceUuid,
      cmd: argData
    }

    await MicroserviceArgManager.create(envObj, transaction)
  }
}

async function _updateCdiDevices (cdiDevices, microserviceUuid, transaction) {
  await MicroserviceCdiDevManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  for (const cdiDevicesData of cdiDevices) {
    const envObj = {
      microserviceUuid: microserviceUuid,
      cdiDevices: cdiDevicesData
    }

    await MicroserviceCdiDevManager.create(envObj, transaction)
  }
}

async function _updateCapAdd (capAdd, microserviceUuid, transaction) {
  await MicroserviceCapAddManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  for (const capAddData of capAdd) {
    const envObj = {
      microserviceUuid: microserviceUuid,
      capAdd: capAddData
    }

    await MicroserviceCapAddManager.create(envObj, transaction)
  }
}

async function _updateCapDrop (capDrop, microserviceUuid, transaction) {
  await MicroserviceCapDropManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  for (const capDropData of capDrop) {
    const envObj = {
      microserviceUuid: microserviceUuid,
      capDrop: capDropData
    }

    await MicroserviceCapDropManager.create(envObj, transaction)
  }
}

async function _updatePorts (newPortMappings, microservice, transaction) {
  await MicroservicePortService.deletePortMappings(microservice, transaction)
  for (const portMapping of newPortMappings) {
    await createPortMappingEndPoint(microservice.uuid, portMapping, false, transaction)
  }
}

async function _updateSystemPorts (newPortMappings, microservice, transaction) {
  await MicroservicePortService.deletePortMappings(microservice, transaction)
  for (const portMapping of newPortMappings) {
    await createSystemPortMappingEndPoint(microservice.uuid, portMapping, false, transaction)
  }
}

async function _updateChangeTracking (configUpdated, fogNodeUuid, transaction) {
  if (configUpdated) {
    await ChangeTrackingService.update(fogNodeUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  } else {
    await ChangeTrackingService.update(fogNodeUuid, ChangeTrackingService.events.microserviceList, transaction)
  }
}

async function _checkForDuplicateName (name, item, applicationId, transaction) {
  if (name) {
    const where = item.id
      ? {
        name: name,
        uuid: { [Op.ne]: item.id },
        delete: false,
        applicationId
      }
      : {
        name: name,
        applicationId,
        delete: false
      }

    const result = await MicroserviceManager.findOne(where, transaction)
    if (result) {
      throw new Errors.DuplicatePropertyError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, name))
    }
  }
}

async function _validateMicroserviceOnGet (microserviceUuid, transaction) {
  const where = {
    uuid: microserviceUuid
  }
  const microservice = await MicroserviceManager.findMicroserviceOnGet(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_MICROSERVICE_USER)
  }
}

async function _validateSystemMicroserviceOnGet (microserviceUuid, transaction) {
  const where = {
    uuid: microserviceUuid
  }
  const microservice = await MicroserviceManager.findSystemMicroserviceOnGet(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_MICROSERVICE_USER)
  }
}

async function deleteMicroserviceWithRoutesAndPortMappings (microservice, transaction) {
  // Clear Microservice -> NatsUser FK before revoking user (Postgres/MySQL enforce FK; SQLite does not)
  await MicroserviceManager.update(
    { uuid: microservice.uuid },
    { natsAccountId: null, natsUserId: null, natsCredsSecretName: null },
    transaction
  )
  await NatsAuthService.revokeMicroserviceUser(microservice.uuid, transaction)
  await MicroservicePortService.deletePortMappings(microservice, transaction)

  // Delete service account for microservice (safety net in case it wasn't deleted earlier)
  await _deleteServiceAccountForMicroservice(microservice.uuid, transaction)

  await MicroserviceManager.delete({
    uuid: microservice.uuid
  }, transaction)
}

async function _buildGetMicroserviceResponse (microservice, transaction) {
  const microserviceUuid = microservice.uuid

  // get additional data
  const portMappings = await MicroservicePortService.getPortMappings(microserviceUuid, transaction)
  const application = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
  const extraHosts = await MicroserviceExtraHostManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
  const images = await CatalogItemImageManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
  const volumeMappings = await VolumeMappingManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
  const env = await MicroserviceEnvManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const cmd = await MicroserviceArgManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const arg = cmd.map((it) => it.cmd)
  const cdiDevices = await MicroserviceCdiDevManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const cdiDevs = cdiDevices.map((it) => it.cdiDevices)
  const capAdd = await MicroserviceCapAddManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const capAdds = capAdd.map((it) => it.capAdd)
  const capDrop = await MicroserviceCapDropManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const capDrops = capDrop.map((it) => it.capDrop)
  const status = await MicroserviceStatusManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const execStatus = await MicroserviceExecStatusManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const healthCheck = await MicroserviceHealthCheckManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  // build microservice response
  const res = Object.assign({}, microservice)
  res.ports = []
  for (const pm of portMappings) {
    const mapping = { internal: pm.portInternal, external: pm.portExternal, protocol: pm.isUdp ? 'udp' : 'tcp' }
    // await MicroservicePortService.buildPublicPortMapping(pm, mapping, transaction)
    res.ports.push(mapping)
  }
  res.volumeMappings = volumeMappings.map((vm) => vm.dataValues)
  res.env = env
  res.cmd = arg
  res.cdiDevices = cdiDevs
  res.capAdd = capAdds
  res.capDrop = capDrops
  res.extraHosts = extraHosts.map(eH => ({ name: eH.name, address: eH.template, value: eH.value }))
  res.images = images.map(i => ({ containerImage: i.containerImage, fogTypeId: i.fogTypeId }))
  if (status && status.length) {
    res.status = status[0]
  }
  if (execStatus && execStatus.length) {
    res.execStatus = execStatus[0]
  }
  if (healthCheck && healthCheck.length) {
    const healthCheckData = healthCheck[0]
    // Create a copy of the health check data to avoid modifying the Sequelize object
    const healthCheckResponse = {
      test: healthCheckData.test
    }

    // Only add fields if they are not null
    if (healthCheckData.interval !== null) {
      healthCheckResponse.interval = healthCheckData.interval
    }
    if (healthCheckData.timeout !== null) {
      healthCheckResponse.timeout = healthCheckData.timeout
    }
    if (healthCheckData.startPeriod !== null) {
      healthCheckResponse.startPeriod = healthCheckData.startPeriod
    }
    if (healthCheckData.startInterval !== null) {
      healthCheckResponse.startInterval = healthCheckData.startInterval
    }
    if (healthCheckData.retries !== null) {
      healthCheckResponse.retries = healthCheckData.retries
    }

    // Handle the test field - ensure it's always an array
    if (healthCheckResponse.test) {
      if (typeof healthCheckResponse.test === 'string') {
        // It's a JSON string, try to parse it
        try {
          healthCheckResponse.test = JSON.parse(healthCheckResponse.test)
        } catch (e) {
          // If not valid JSON, treat as a single string command
          healthCheckResponse.test = [healthCheckResponse.test]
        }
      } else if (!Array.isArray(healthCheckResponse.test)) {
        // If it's not an array, convert to array
        healthCheckResponse.test = [healthCheckResponse.test]
      }
      // If it's already an array, leave as is
    }

    if (healthCheckResponse.test && healthCheckResponse.test.length > 0) {
      res.healthCheck = healthCheckResponse
    } else {
      res.healthCheck = {}
    }
  }

  res.logSize *= 1

  res.application = (application || { name: '' }).name

  // API retrocompatibility
  res.flowId = res.applicationId

  // Resolve natsRuleId to rule name for API response
  let natsRuleName = null
  if (res.natsRuleId) {
    const natsRule = await NatsUserRuleManager.findOne({ id: res.natsRuleId }, transaction)
    natsRuleName = natsRule ? natsRule.name : null
  }
  res.natsConfig = {
    natsAccess: !!res.natsAccess,
    natsRule: natsRuleName
  }
  delete res.natsRuleId

  return res
}

async function createExecEndPoint (microserviceUuid, isCLI, transaction) {
  const microservice = await MicroserviceManager.findOneWithCategory({ uuid: microserviceUuid }, transaction)
  if (microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_MICROSERVICE_USER)
  }

  await MicroserviceManager.update({ uuid: microservice.uuid }, { execEnabled: true }, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceExecSessions, transaction)

  const updatedMicroservice = await MicroserviceManager.findOneWithCategory({ uuid: microservice.uuid }, transaction)

  return {
    uuid: microservice.uuid,
    execEnabled: updatedMicroservice.execEnabled
  }
}

async function deleteExecEndPoint (microserviceUuid, isCLI, transaction) {
  const microservice = await MicroserviceManager.findOneWithCategory({ uuid: microserviceUuid }, transaction)
  if (microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_MICROSERVICE_USER)
  }

  await MicroserviceManager.update({ uuid: microservice.uuid }, { execEnabled: false }, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceExecSessions, transaction)

  const updatedMicroservice = await MicroserviceManager.findOneWithCategory({ uuid: microservice.uuid }, transaction)

  return {
    uuid: microservice.uuid,
    execEnabled: updatedMicroservice.execEnabled
  }
}

async function createSystemExecEndPoint (microserviceUuid, isCLI, transaction) {
  const microservice = await MicroserviceManager.findOneWithCategory({ uuid: microserviceUuid }, transaction)
  // if (microservice.catalogItem && microservice.catalogItem.category !== 'SYSTEM') {
  //   throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  // }
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_MICROSERVICE_USER)
  }
  await MicroserviceManager.update({ uuid: microservice.uuid }, { execEnabled: true }, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceExecSessions, transaction)

  const updatedMicroservice = await MicroserviceManager.findOneWithCategory({ uuid: microservice.uuid }, transaction)

  return {
    uuid: microservice.uuid,
    execEnabled: updatedMicroservice.execEnabled
  }
}

async function deleteSystemExecEndPoint (microserviceUuid, isCLI, transaction) {
  const microservice = await MicroserviceManager.findOneWithCategory({ uuid: microserviceUuid }, transaction)
  // if (microservice.catalogItem && microservice.catalogItem.category !== 'SYSTEM') {
  //   throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  // }
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_MICROSERVICE_USER)
  }

  await MicroserviceManager.update({ uuid: microservice.uuid }, { execEnabled: false }, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceExecSessions, transaction)

  const updatedMicroservice = await MicroserviceManager.findOneWithCategory({ uuid: microservice.uuid }, transaction)

  return {
    uuid: microservice.uuid,
    execEnabled: updatedMicroservice.execEnabled
  }
}

async function startMicroserviceEndPoint (microserviceUuid, isCLI, transaction) {
  const microservice = await MicroserviceManager.findOneWithCategory({ uuid: microserviceUuid }, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }

  // Check if the parent application is activated
  const application = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
  if (!application || !application.isActivated) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.APPLICATION_NOT_ACTIVATED, application ? application.name : 'Unknown'))
  }

  await MicroserviceManager.update({ uuid: microservice.uuid }, { isActivated: true }, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceList, transaction)

  return {
    uuid: microservice.uuid,
    isActivated: true
  }
}

async function stopMicroserviceEndPoint (microserviceUuid, isCLI, transaction) {
  const microservice = await MicroserviceManager.findOneWithCategory({ uuid: microserviceUuid }, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }

  await MicroserviceManager.update({ uuid: microservice.uuid }, { isActivated: false }, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceList, transaction)

  return {
    uuid: microservice.uuid,
    isActivated: false
  }
}

async function reconcileNatsForApplication (applicationId, transaction) {
  const application = await ApplicationManager.findOne({ id: applicationId }, transaction)
  if (!application) {
    return
  }
  const microservices = await MicroserviceManager.findAll({ applicationId }, transaction)
  for (const microservice of microservices) {
    if (!application.natsAccess || !microservice.natsAccess) {
      if (microservice.natsUserId || microservice.natsCredsSecretName || microservice.natsAccess) {
        await NatsAuthService.revokeMicroserviceUser(microservice.uuid, transaction)
        await _detachNatsCredsForMicroservice(microservice, transaction)
      }
      continue
    }
    const reconcileTriggerOptions = { triggerReconcile: false }
    await NatsAuthService.reissueUserForMicroservice(microservice.uuid, transaction, reconcileTriggerOptions)
    const refreshed = await MicroserviceManager.findOne({ uuid: microservice.uuid }, transaction)
    await _ensureNatsCredsForMicroservice(refreshed || microservice, transaction)
  }
}

const bypassOptions = { bypassQueue: true }

module.exports = {
  createMicroserviceEndPoint: TransactionDecorator.generateTransaction(createMicroserviceEndPoint, bypassOptions),
  createPortMappingEndPoint: TransactionDecorator.generateTransaction(createPortMappingEndPoint),
  createSystemPortMappingEndPoint: TransactionDecorator.generateTransaction(createSystemPortMappingEndPoint),
  createVolumeMappingEndPoint: TransactionDecorator.generateTransaction(createVolumeMappingEndPoint),
  createSystemVolumeMappingEndPoint: TransactionDecorator.generateTransaction(createSystemVolumeMappingEndPoint),
  deleteMicroserviceEndPoint: TransactionDecorator.generateTransaction(deleteMicroserviceEndPoint, bypassOptions),
  deleteMicroserviceWithRoutesAndPortMappings: deleteMicroserviceWithRoutesAndPortMappings,
  deleteNotRunningMicroservices: deleteNotRunningMicroservices,
  deletePortMappingEndPoint: TransactionDecorator.generateTransaction(deletePortMappingEndPoint),
  deleteSystemPortMappingEndPoint: TransactionDecorator.generateTransaction(deleteSystemPortMappingEndPoint),
  deleteVolumeMappingEndPoint: TransactionDecorator.generateTransaction(deleteVolumeMappingEndPoint),
  deleteSystemVolumeMappingEndPoint: TransactionDecorator.generateTransaction(deleteSystemVolumeMappingEndPoint),
  getMicroserviceEndPoint: TransactionDecorator.generateTransaction(getMicroserviceEndPoint),
  getSystemMicroserviceEndPoint: TransactionDecorator.generateTransaction(getSystemMicroserviceEndPoint),
  isMicroserviceRouter,
  isMicroserviceNats,
  listMicroservicePortMappingsEndPoint: TransactionDecorator.generateTransaction(listPortMappingsEndPoint),
  listMicroservicesEndPoint: TransactionDecorator.generateTransaction(listMicroservicesEndPoint),
  listSystemMicroservicesEndPoint: TransactionDecorator.generateTransaction(listSystemMicroservicesEndPoint),
  listVolumeMappingsEndPoint: TransactionDecorator.generateTransaction(listVolumeMappingsEndPoint),
  updateMicroserviceEndPoint: TransactionDecorator.generateTransaction(updateMicroserviceEndPoint, bypassOptions),
  updateSystemMicroserviceEndPoint: TransactionDecorator.generateTransaction(updateSystemMicroserviceEndPoint, bypassOptions),
  updateMicroserviceConfigEndPoint: TransactionDecorator.generateTransaction(updateMicroserviceConfigEndPoint),
  getMicroserviceConfigEndPoint: TransactionDecorator.generateTransaction(getMicroserviceConfigEndPoint),
  getSystemMicroserviceConfigEndPoint: TransactionDecorator.generateTransaction(getSystemMicroserviceConfigEndPoint),
  deleteMicroserviceConfigEndPoint: TransactionDecorator.generateTransaction(deleteMicroserviceConfigEndPoint),
  updateSystemMicroserviceConfigEndPoint: TransactionDecorator.generateTransaction(updateSystemMicroserviceConfigEndPoint),
  deleteSystemMicroserviceConfigEndPoint: TransactionDecorator.generateTransaction(deleteSystemMicroserviceConfigEndPoint),
  rebuildMicroserviceEndPoint: TransactionDecorator.generateTransaction(rebuildMicroserviceEndPoint),
  rebuildSystemMicroserviceEndPoint: TransactionDecorator.generateTransaction(rebuildSystemMicroserviceEndPoint),
  buildGetMicroserviceResponse: _buildGetMicroserviceResponse,
  updateChangeTracking: _updateChangeTracking,
  createExecEndPoint: TransactionDecorator.generateTransaction(createExecEndPoint),
  deleteExecEndPoint: TransactionDecorator.generateTransaction(deleteExecEndPoint),
  createSystemExecEndPoint: TransactionDecorator.generateTransaction(createSystemExecEndPoint),
  deleteSystemExecEndPoint: TransactionDecorator.generateTransaction(deleteSystemExecEndPoint),
  startMicroserviceEndPoint: TransactionDecorator.generateTransaction(startMicroserviceEndPoint),
  stopMicroserviceEndPoint: TransactionDecorator.generateTransaction(stopMicroserviceEndPoint),
  reconcileNatsForApplication: TransactionDecorator.generateTransaction(reconcileNatsForApplication, bypassOptions)
}
