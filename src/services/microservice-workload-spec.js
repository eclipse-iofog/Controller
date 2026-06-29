const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const constants = require('../helpers/constants')
const FogManager = require('../data/managers/iofog-manager')
const ApplicationManager = require('../data/managers/application-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceArgManager = require('../data/managers/microservice-arg-manager')
const MicroserviceCdiDevManager = require('../data/managers/microservice-cdi-device-manager')
const MicroserviceCapAddManager = require('../data/managers/microservice-cap-add-manager')
const MicroserviceCapDropManager = require('../data/managers/microservice-cap-drop-manager')
const MicroserviceEnvManager = require('../data/managers/microservice-env-manager')
const MicroserviceExtraHostManager = require('../data/managers/microservice-extra-host-manager')
const MicroserviceHealthCheckManager = require('../data/managers/microservice-healthcheck-manager')
const ConfigMapManager = require('../data/managers/config-map-manager')
const SecretManager = require('../data/managers/secret-manager')

function validateMicroserviceConfig (config) {
  if (config) {
    return config.split('\\"').join('"').split('"').join('\"') // eslint-disable-line no-useless-escape
  }
  return '{}'
}

function validateMicroserviceAnnotations (annotations) {
  if (annotations) {
    return annotations.split('\\"').join('"').split('"').join('\"') // eslint-disable-line no-useless-escape
  }
  return undefined
}

function _validateMicroserviceHealthCheck (healthCheck) {
  if (healthCheck) {
    return JSON.stringify(healthCheck)
  }
  return undefined
}

function processHealthCheckForDB (healthCheckData) {
  if (!healthCheckData) {
    return null
  }

  return {
    test: _validateMicroserviceHealthCheck(healthCheckData.test),
    interval: healthCheckData.interval,
    timeout: healthCheckData.timeout,
    startPeriod: healthCheckData.startPeriod,
    startInterval: healthCheckData.startInterval,
    retries: healthCheckData.retries
  }
}

function buildScalarColumns (spec, { defaultLogSize = constants.MICROSERVICE_DEFAULT_LOG_SIZE } = {}) {
  return AppHelper.deleteUndefinedFields({
    config: spec.config !== undefined ? validateMicroserviceConfig(spec.config) : undefined,
    annotations: spec.annotations !== undefined ? validateMicroserviceAnnotations(spec.annotations) : undefined,
    hostNetworkMode: spec.hostNetworkMode,
    isPrivileged: spec.isPrivileged,
    logSize: spec.logSize != null ? spec.logSize * 1 : undefined,
    runtime: spec.runtime,
    pidMode: spec.pidMode,
    ipcMode: spec.ipcMode,
    runAsUser: spec.runAsUser,
    platform: spec.platform,
    cpuSetCpus: spec.cpuSetCpus,
    memoryLimit: spec.memoryLimit
  })
}

function buildCreateScalarColumns (spec, { defaultLogSize = constants.MICROSERVICE_DEFAULT_LOG_SIZE } = {}) {
  const columns = buildScalarColumns(spec, { defaultLogSize })
  if (columns.logSize == null) {
    columns.logSize = defaultLogSize * 1
  }
  if (columns.config == null) {
    columns.config = validateMicroserviceConfig(spec.config)
  }
  return columns
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

async function validateExtraHosts (spec, fogUuid, transaction) {
  if (!spec.extraHosts || spec.extraHosts.length === 0) {
    return []
  }
  const extraHosts = []
  for (const extraHost of spec.extraHosts) {
    extraHosts.push(await _validateExtraHost(extraHost, fogUuid, transaction))
  }
  return extraHosts
}

async function _buildEnvRecord (microserviceUuid, envData, transaction) {
  const envObj = {
    microserviceUuid,
    key: envData.key,
    value: envData.value
  }

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

  return envObj
}

async function _createEnv (microserviceUuid, envData, transaction) {
  const envObj = await _buildEnvRecord(microserviceUuid, envData, transaction)
  await MicroserviceEnvManager.create(envObj, transaction)
}

async function _updateEnv (env, microserviceUuid, transaction) {
  await MicroserviceEnvManager.delete({ microserviceUuid }, transaction)
  for (const envData of env) {
    await _createEnv(microserviceUuid, envData, transaction)
  }
}

async function _createExtraHost (microserviceUuid, extraHostData, transaction) {
  await MicroserviceExtraHostManager.create({
    ...extraHostData,
    microserviceUuid
  }, transaction)
}

async function _updateExtraHosts (extraHosts, microserviceUuid, transaction) {
  await MicroserviceExtraHostManager.delete({ microserviceUuid }, transaction)
  for (const extraHost of extraHosts) {
    await _createExtraHost(microserviceUuid, extraHost, transaction)
  }
}

async function _createArg (microserviceUuid, arg, transaction) {
  await MicroserviceArgManager.create({ cmd: arg, microserviceUuid }, transaction)
}

async function _updateArg (arg, microserviceUuid, transaction) {
  await MicroserviceArgManager.delete({ microserviceUuid }, transaction)
  for (const argData of arg) {
    await _createArg(microserviceUuid, argData, transaction)
  }
}

async function _createCdiDevice (microserviceUuid, cdiDevice, transaction) {
  await MicroserviceCdiDevManager.create({ cdiDevices: cdiDevice, microserviceUuid }, transaction)
}

async function _updateCdiDevices (cdiDevices, microserviceUuid, transaction) {
  await MicroserviceCdiDevManager.delete({ microserviceUuid }, transaction)
  for (const cdiDevice of cdiDevices) {
    await _createCdiDevice(microserviceUuid, cdiDevice, transaction)
  }
}

async function _createCapAdd (microserviceUuid, capAdd, transaction) {
  await MicroserviceCapAddManager.create({ capAdd, microserviceUuid }, transaction)
}

async function _updateCapAdd (capAdd, microserviceUuid, transaction) {
  await MicroserviceCapAddManager.delete({ microserviceUuid }, transaction)
  for (const capAddData of capAdd) {
    await _createCapAdd(microserviceUuid, capAddData, transaction)
  }
}

async function _createCapDrop (microserviceUuid, capDrop, transaction) {
  await MicroserviceCapDropManager.create({ capDrop, microserviceUuid }, transaction)
}

async function _updateCapDrop (capDrop, microserviceUuid, transaction) {
  await MicroserviceCapDropManager.delete({ microserviceUuid }, transaction)
  for (const capDropData of capDrop) {
    await _createCapDrop(microserviceUuid, capDropData, transaction)
  }
}

async function _createHealthCheck (microserviceUuid, healthCheck, transaction) {
  const healthCheckData = {
    microserviceUuid,
    ...processHealthCheckForDB(healthCheck)
  }
  if (healthCheckData.test && healthCheckData.test.length > 0) {
    await MicroserviceHealthCheckManager.create(healthCheckData, transaction)
  }
}

async function _updateHealthCheck (microserviceUuid, healthCheck, transaction) {
  await MicroserviceHealthCheckManager.delete({ microserviceUuid }, transaction)
  if (healthCheck) {
    await _createHealthCheck(microserviceUuid, healthCheck, transaction)
  }
}

async function createWorkloadRelations (microservice, spec, { validatedExtraHosts, transaction }) {
  const microserviceUuid = microservice.uuid

  if (validatedExtraHosts && validatedExtraHosts.length) {
    for (const extraHost of validatedExtraHosts) {
      await _createExtraHost(microserviceUuid, extraHost, transaction)
    }
  }

  if (spec.env) {
    for (const env of spec.env) {
      await _createEnv(microserviceUuid, env, transaction)
    }
  }

  if (spec.cmd) {
    for (const arg of spec.cmd) {
      await _createArg(microserviceUuid, arg, transaction)
    }
  }

  if (spec.cdiDevices) {
    for (const cdiDevice of spec.cdiDevices) {
      await _createCdiDevice(microserviceUuid, cdiDevice, transaction)
    }
  }

  if (spec.capAdd) {
    for (const capAdd of spec.capAdd) {
      await _createCapAdd(microserviceUuid, capAdd, transaction)
    }
  }

  if (spec.capDrop) {
    for (const capDrop of spec.capDrop) {
      await _createCapDrop(microserviceUuid, capDrop, transaction)
    }
  }

  if (spec.healthCheck) {
    await _createHealthCheck(microserviceUuid, spec.healthCheck, transaction)
  }
}

async function updateWorkloadRelations (microserviceUuid, spec, { validatedExtraHosts, transaction }) {
  if (validatedExtraHosts) {
    await _updateExtraHosts(validatedExtraHosts, microserviceUuid, transaction)
  }

  if (spec.env) {
    await _updateEnv(spec.env, microserviceUuid, transaction)
  }

  if (spec.cmd) {
    await _updateArg(spec.cmd, microserviceUuid, transaction)
  }

  if (spec.cdiDevices) {
    await _updateCdiDevices(spec.cdiDevices, microserviceUuid, transaction)
  }

  if (spec.capAdd) {
    await _updateCapAdd(spec.capAdd, microserviceUuid, transaction)
  }

  if (spec.capDrop) {
    await _updateCapDrop(spec.capDrop, microserviceUuid, transaction)
  }

  if (spec.healthCheck) {
    await _updateHealthCheck(microserviceUuid, spec.healthCheck, transaction)
  }
}

function shouldRebuildForWorkloadChange (existing, spec, { config, annotations, imagesChanged }) {
  return !!(
    imagesChanged ||
    existing.schedule !== 0 ||
    (spec.hostNetworkMode !== undefined && existing.hostNetworkMode !== spec.hostNetworkMode) ||
    (spec.isPrivileged !== undefined && existing.isPrivileged !== spec.isPrivileged) ||
    (spec.logSize !== undefined && existing.logSize !== spec.logSize * 1) ||
    (spec.runtime !== undefined && existing.runtime !== spec.runtime) ||
    (spec.pidMode !== undefined && existing.pidMode !== spec.pidMode) ||
    (spec.ipcMode !== undefined && existing.ipcMode !== spec.ipcMode) ||
    (spec.runAsUser !== undefined && existing.runAsUser !== spec.runAsUser) ||
    (spec.platform !== undefined && existing.platform !== spec.platform) ||
    (spec.cpuSetCpus !== undefined && existing.cpuSetCpus !== spec.cpuSetCpus) ||
    (spec.memoryLimit !== undefined && existing.memoryLimit !== spec.memoryLimit) ||
    (config !== undefined && existing.config !== config) ||
    (annotations !== undefined && existing.annotations !== annotations) ||
    spec.env ||
    spec.volumeMappings ||
    spec.ports ||
    spec.extraHosts ||
    spec.cmd ||
    spec.cdiDevices ||
    spec.capAdd ||
    spec.capDrop ||
    spec.healthCheck
  )
}

module.exports = {
  validateMicroserviceConfig,
  validateMicroserviceAnnotations,
  processHealthCheckForDB,
  buildScalarColumns,
  buildCreateScalarColumns,
  validateExtraHosts,
  createWorkloadRelations,
  updateWorkloadRelations,
  shouldRebuildForWorkloadChange
}
