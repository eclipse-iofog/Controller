/*
 * *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const config = require('../config')
const path = require('path')
const fs = require('fs')
const formidable = require('formidable')
// const Sequelize = require('sequelize')
const moment = require('moment')
// const Op = Sequelize.Op
const logger = require('../logger')

const TransactionDecorator = require('../decorators/transaction-decorator')
const FogProvisionKeyManager = require('../data/managers/iofog-provision-key-manager')
const FogManager = require('../data/managers/iofog-manager')
const FogKeyService = require('../services/iofog-key-service')
const ChangeTrackingService = require('./change-tracking-service')
const FogVersionCommandManager = require('../data/managers/iofog-version-command-manager')
const StraceManager = require('../data/managers/strace-manager')
const RegistryManager = require('../data/managers/registry-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const { microserviceState, microserviceExecState } = require('../enums/microservice-state')
const FogStates = require('../enums/fog-state')
const Validator = require('../schemas')
const Errors = require('../helpers/errors')
const AppHelper = require('../helpers/app-helper')
const ErrorMessages = require('../helpers/error-messages')
const HWInfoManager = require('../data/managers/hw-info-manager')
const USBInfoManager = require('../data/managers/usb-info-manager')
const TunnelManager = require('../data/managers/tunnel-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceService = require('../services/microservices-service')
const ApplicationManager = require('../data/managers/application-manager')
const EdgeResourceService = require('./edge-resource-service')
const constants = require('../helpers/constants')
const SecretManager = require('../data/managers/secret-manager')
const ConfigMapManager = require('../data/managers/config-map-manager')
const MicroserviceLogStatusManager = require('../data/managers/microservice-log-status-manager')
const FogLogStatusManager = require('../data/managers/fog-log-status-manager')
const RbacRoleManager = require('../data/managers/rbac-role-manager')

const IncomingForm = formidable.IncomingForm
const CHANGE_TRACKING_DEFAULT = {}
const CHANGE_TRACKING_KEYS = ['config', 'version', 'reboot', 'deleteNode', 'microserviceList', 'microserviceConfig', 'registries', 'tunnel', 'diagnostics', 'isImageSnapshot', 'prune', 'routerChanged', 'linkedEdgeResources', 'volumeMounts', 'execSessions', 'microserviceLogs', 'fogLogs']
for (const key of CHANGE_TRACKING_KEYS) {
  CHANGE_TRACKING_DEFAULT[key] = false
}

const agentProvision = async function (provisionData, transaction) {
  await Validator.validate(provisionData, Validator.schemas.agentProvision)

  const namespace = process.env.CONTROLLER_NAMESPACE || config.get('app.namespace', 'iofog')

  const provision = await FogProvisionKeyManager.findOne({
    provisionKey: provisionData.key
  }, transaction)

  if (!provision) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_PROVISIONING_KEY)
  }

  const currentTime = new Date()
  if (provision.expirationTime < currentTime) {
    throw new Errors.AuthenticationError(ErrorMessages.EXPIRED_PROVISION_KEY)
  }

  const fog = await FogManager.findOne({
    uuid: provision.iofogUuid
  }, transaction)

  if (!fog) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_IOFOG_UUID)
  }

  await _checkMicroservicesFogType(fog, provisionData.type, transaction)

  // Generate Ed25519 key pair
  const keyPair = await FogKeyService.generateKeyPair(transaction)

  // Store the public key
  await FogKeyService.storePublicKey(fog.uuid, keyPair.publicKey, transaction)

  await FogManager.update({
    uuid: fog.uuid
  }, {
    fogTypeId: provisionData.type
  }, transaction)

  await FogProvisionKeyManager.delete({
    provisionKey: provisionData.key
  }, transaction)

  await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.volumeMounts, transaction)
  await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.registries, transaction)
  await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.microserviceFull, transaction)

  return {
    uuid: fog.uuid,
    privateKey: keyPair.privateKey,
    namespace: namespace
  }
}

const agentDeprovision = async function (deprovisionData, fog, transaction) {
  await Validator.validate(deprovisionData, Validator.schemas.agentDeprovision)

  await MicroserviceStatusManager.update(
    { microserviceUuid: deprovisionData.microserviceUuids },
    { status: microserviceState.DELETING },
    transaction
  )

  await MicroserviceExecStatusManager.update(
    { microserviceUuid: deprovisionData.microserviceUuids },
    { status: microserviceExecState.INACTIVE },
    transaction
  )

  await _invalidateFogNode(fog, transaction)

  // Delete the public key
  await FogKeyService.deletePublicKey(fog.uuid, transaction)
}

const _invalidateFogNode = async function (fog, transaction) {
  const where = { uuid: fog.uuid }
  const data = { daemonStatus: FogStates.DEPROVISIONED, ipAddress: '0.0.0.0', ipAddressExternal: '0.0.0.0' }
  await FogManager.update(where, data, transaction)
  const updatedFog = Object.assign({}, fog)
  updatedFog.daemonStatus = FogStates.DEPROVISIONED
  updatedFog.ipAddress = '0.0.0.0'
  updatedFog.ipAddressExternal = '0.0.0.0'
  return updatedFog
}

const getAgentConfig = async function (fog, transaction) {
  const fogData = await FogManager.findOne({
    uuid: fog.uuid
  }, transaction)
  const resp = {
    networkInterface: fogData.networkInterface,
    dockerUrl: fogData.dockerUrl,
    diskLimit: fogData.diskLimit,
    diskDirectory: fogData.diskDirectory,
    memoryLimit: fogData.memoryLimit,
    cpuLimit: fogData.cpuLimit,
    logLimit: fogData.logLimit,
    logDirectory: fogData.logDirectory,
    logFileCount: fogData.logFileCount,
    gpsMode: fogData.gpsMode,
    gpsDevice: fogData.gpsDevice,
    gpsScanFrequency: fogData.gpsScanFrequency,
    edgeGuardFrequency: fogData.edgeGuardFrequency,
    statusFrequency: fogData.statusFrequency,
    changeFrequency: fogData.changeFrequency,
    deviceScanFrequency: fogData.deviceScanFrequency,
    watchdogEnabled: fogData.watchdogEnabled,
    latitude: fogData.latitude,
    longitude: fogData.longitude,
    logLevel: fogData.logLevel,
    availableDiskThreshold: fogData.availableDiskThreshold,
    dockerPruningFrequency: fogData.dockerPruningFrequency,
    timeZone: fogData.timeZone
  }
  return resp
}

const updateAgentConfig = async function (updateData, fog, transaction) {
  await Validator.validate(updateData, Validator.schemas.updateAgentConfig)

  let update = {
    networkInterface: updateData.networkInterface,
    dockerUrl: updateData.dockerUrl,
    diskLimit: updateData.diskLimit,
    diskDirectory: updateData.diskDirectory,
    memoryLimit: updateData.memoryLimit,
    cpuLimit: updateData.cpuLimit,
    logLimit: updateData.logLimit,
    logDirectory: updateData.logDirectory,
    logFileCount: updateData.logFileCount,
    statusFrequency: updateData.statusFrequency,
    changeFrequency: updateData.changeFrequency,
    deviceScanFrequency: updateData.deviceScanFrequency,
    watchdogEnabled: updateData.watchdogEnabled,
    latitude: updateData.latitude,
    longitude: updateData.longitude,
    gpsMode: updateData.gpsMode,
    gpsDevice: updateData.gpsDevice,
    gpsScanFrequency: updateData.gpsScanFrequency,
    edgeGuardFrequency: updateData.edgeGuardFrequency,
    dockerPruningFrequency: updateData.dockerPruningFrequency,
    availableDiskThreshold: updateData.availableDiskThreshold,
    logLevel: updateData.logLevel,
    timeZone: updateData.timeZone
  }
  update = AppHelper.deleteUndefinedFields(update)

  await FogManager.update({
    uuid: fog.uuid
  }, update, transaction)
}

const updateAgentGpsEndPoint = async function (updateData, fog, transaction) {
  await Validator.validate(updateData, Validator.schemas.updateAgentGps)

  let update = {
    latitude: updateData.latitude,
    longitude: updateData.longitude
  }
  update = AppHelper.deleteUndefinedFields(update)

  await FogManager.update({
    uuid: fog.uuid
  }, update, transaction)
}

const getAgentConfigChanges = async function (ioFog, transaction) {
  const changeTrackings = await ChangeTrackingService.getByIoFogUuid(ioFog.uuid, transaction)
  const res = { ...CHANGE_TRACKING_DEFAULT }
  res.lastUpdated = moment().toISOString()

  for (const changeTracking of changeTrackings) {
    for (const key of CHANGE_TRACKING_KEYS) {
      res[key] = !!res[key] || !!changeTracking[key]
    }
    res.lastUpdated = changeTracking.lastUpdated
  }
  return res
}

const resetAgentConfigChanges = async function (ioFog, body, transaction) {
  await ChangeTrackingService.resetIfNotUpdated(ioFog.uuid, body.lastUpdated, transaction)
  return {}
}

const updateAgentStatus = async function (agentStatus, fog, transaction) {
  await Validator.validate(agentStatus, Validator.schemas.updateAgentStatus)

  let fogStatus = {
    daemonStatus: agentStatus.daemonStatus,
    daemonOperatingDuration: agentStatus.daemonOperatingDuration,
    daemonLastStart: agentStatus.daemonLastStart,
    memoryUsage: agentStatus.memoryUsage,
    diskUsage: agentStatus.diskUsage,
    cpuUsage: agentStatus.cpuUsage,
    memoryViolation: agentStatus.memoryViolation,
    diskViolation: agentStatus.diskViolation,
    cpuViolation: agentStatus.cpuViolation,
    systemAvailableDisk: agentStatus.systemAvailableDisk,
    systemAvailableMemory: agentStatus.systemAvailableMemory,
    systemTotalCpu: agentStatus.systemTotalCpu,
    securityStatus: agentStatus.securityStatus,
    securityViolationInfo: agentStatus.securityViolationInfo,
    repositoryCount: agentStatus.repositoryCount,
    repositoryStatus: agentStatus.repositoryStatus,
    systemTime: agentStatus.systemTime,
    lastStatusTime: agentStatus.lastStatusTime,
    ipAddress: agentStatus.ipAddress,
    ipAddressExternal: agentStatus.ipAddressExternal,
    processedMessages: agentStatus.processedMessages,
    microserviceMessageCounts: agentStatus.microserviceMessageCounts,
    messageSpeed: agentStatus.messageSpeed,
    lastCommandTime: agentStatus.lastCommandTime,
    tunnelStatus: agentStatus.tunnelStatus,
    version: agentStatus.version,
    isReadyToUpgrade: agentStatus.isReadyToUpgrade,
    isReadyToRollback: agentStatus.isReadyToRollback,
    activeVolumeMounts: agentStatus.activeVolumeMounts,
    volumeMountLastUpdate: agentStatus.volumeMountLastUpdate,
    gpsStatus: agentStatus.gpsStatus
  }

  fogStatus = AppHelper.deleteUndefinedFields(fogStatus)

  const existingFog = await FogManager.findOne({
    uuid: fog.uuid
  }, transaction)

  if (!existingFog.warningMessage.includes('Background orchestration')) {
    fogStatus.daemonStatus = agentStatus.daemonStatus
  } else {
    fogStatus.daemonStatus = FogStates.WARNING
  }

  if (agentStatus.warningMessage.includes('HW signature changed') || agentStatus.warningMessage.includes('HW signature mismatch')) {
    fogStatus.securityStatus = 'WARNING'
    fogStatus.securityViolationInfo = 'Auto deprovisioned by Agent. HW signature mismatch'
  } else {
    fogStatus.securityStatus = 'OK'
    fogStatus.securityViolationInfo = 'No violation'
  }

  await FogManager.update({
    uuid: fog.uuid
  }, fogStatus, transaction)

  await _updateMicroserviceStatuses(JSON.parse(agentStatus.microserviceStatus), fog, transaction)
  await MicroserviceService.deleteNotRunningMicroservices(fog, transaction)
}

const _updateMicroserviceStatuses = async function (microserviceStatus, fog, transaction) {
  for (const status of microserviceStatus) {
    let microserviceStatus = {
      containerId: status.containerId,
      status: status.status,
      healthStatus: status.healthStatus,
      startTime: status.startTime,
      operatingDuration: status.operatingDuration,
      cpuUsage: status.cpuUsage,
      memoryUsage: status.memoryUsage,
      percentage: status.percentage,
      errorMessage: status.errorMessage,
      ipAddress: status.ipAddress,
      execSessionIds: status.execSessionIds
    }
    microserviceStatus = AppHelper.deleteUndefinedFields(microserviceStatus)
    const microservice = await MicroserviceManager.findOne({
      uuid: status.id
    }, transaction)
    if (microservice && fog.uuid === microservice.iofogUuid) {
      await MicroserviceStatusManager.update({
        microserviceUuid: status.id
      }, microserviceStatus, transaction)
    }
  }
}

const _mapExtraHost = function (extraHost) {
  return `${extraHost.name}:${extraHost.value}`
}

/**
 * Resolve service account rules from roleRef
 * @param {Object} serviceAccount - Service account object (from relationship or lookup)
 * @param {Object} transaction - Database transaction
 * @returns {Object|null} Service account with resolved rules or null if not found
 */
async function _resolveServiceAccountRules (serviceAccount, transaction) {
  try {
    // If serviceAccount is already loaded from relationship, use it
    // Otherwise, it might be null/undefined
    if (!serviceAccount || !serviceAccount.roleRef) {
      return null
    }

    // Get role from roleRef (check system roles first, then database)
    const role = await RbacRoleManager.getRoleWithRules(serviceAccount.roleRef.name, transaction)
    if (!role) {
      return null
    }

    return {
      name: serviceAccount.name,
      roleRef: serviceAccount.roleRef,
      rules: role.rules
    }
  } catch (error) {
    // If service account doesn't exist or error, return null
    return null
  }
}

const getAgentMicroservices = async function (fog, transaction) {
  const microservices = await MicroserviceManager.findAllActiveApplicationMicroservices(fog.uuid, transaction)

  const fogTypeId = fog.fogTypeId

  const response = []
  for (const microservice of microservices) {
    const images = (microservice.images && microservice.images.length > 0) ? microservice.images : microservice.catalogItem.images
    const image = images.find((image) => image.fogTypeId === fogTypeId)
    const imageId = image ? image.containerImage : ''
    if (!imageId || imageId === '') {
      continue
    }

    const isRouter = await MicroserviceService.isMicroserviceRouter(microservice, transaction)
    const isNats = await MicroserviceService.isMicroserviceNats(microservice, transaction)
    const msvcApp = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
    if (!msvcApp) {
      continue
    }
    const application = msvcApp.name
    const env = microservice.env && microservice.env.map((it) => {
      return {
        key: it.key,
        value: it.value
      }
    })
    const cmd = microservice.cmd && microservice.cmd.sort((a, b) => a.id - b.id).map((it) => it.cmd)
    const cdiDevices = microservice.cdiDevices && microservice.cdiDevices.sort((a, b) => a.id - b.id).map((it) => it.cdiDevices)
    const capAdd = microservice.capAdd && microservice.capAdd.sort((a, b) => a.id - b.id).map((it) => it.capAdd)
    const capDrop = microservice.capDrop && microservice.capDrop.sort((a, b) => a.id - b.id).map((it) => it.capDrop)
    const registryId = microservice.catalogItem && microservice.catalogItem.registry ? microservice.catalogItem.registry.id : microservice.registry.id

    const extraHosts = microservice.extraHosts ? microservice.extraHosts.map(_mapExtraHost) : []

    // Process health check data - handle both old and new formats
    let healthCheck = null

    if (microservice.healthCheck) {
      // Handle the test field - it could be already an array or a JSON string
      let testData = microservice.healthCheck.test
      if (testData && testData !== null && testData !== undefined && testData.length > 0) {
        if (typeof testData === 'string') {
          // It's a JSON string, try to parse it
          try {
            testData = JSON.parse(testData)
          } catch (e) {
            // If not valid JSON, treat as a single string command
            testData = [testData]
          }
        } else if (!Array.isArray(testData)) {
          // If it's not an array, convert to array
          testData = [testData]
        }
        // If it's already an array, leave as is
      }

      healthCheck = {
        test: testData,
        interval: microservice.healthCheck.interval,
        timeout: microservice.healthCheck.timeout,
        startPeriod: microservice.healthCheck.startPeriod,
        startInterval: microservice.healthCheck.startInterval,
        retries: microservice.healthCheck.retries
      }
    } else {
      healthCheck = {}
    }

    const responseMicroservice = {
      uuid: microservice.uuid,
      name: microservice.name,
      application,
      imageId: imageId,
      config: microservice.config,
      annotations: microservice.annotations,
      rebuild: microservice.rebuild,
      hostNetworkMode: microservice.hostNetworkMode,
      isPrivileged: microservice.isPrivileged,
      cpuSetCpus: microservice.cpuSetCpus,
      memoryLimit: microservice.memoryLimit,
      healthCheck: healthCheck,
      pidMode: microservice.pidMode,
      ipcMode: microservice.ipcMode,
      runAsUser: microservice.runAsUser,
      platform: microservice.platform,
      runtime: microservice.runtime,
      logSize: parseInt(microservice.logSize) || constants.MICROSERVICE_DEFAULT_LOG_SIZE,
      registryId,
      portMappings: microservice.ports,
      volumeMappings: microservice.volumeMappings,
      imageSnapshot: microservice.imageSnapshot,
      delete: microservice.delete,
      deleteWithCleanup: microservice.deleteWithCleanup,
      env,
      extraHosts,
      cmd,
      cdiDevices,
      capAdd,
      capDrop,
      isRouter,
      isNats,
      execEnabled: microservice.execEnabled,
      schedule: microservice.schedule
    }

    // Resolve service account with rules from relationship
    const serviceAccountData = await _resolveServiceAccountRules(microservice.serviceAccount, transaction)
    if (serviceAccountData) {
      responseMicroservice.serviceAccount = {
        name: serviceAccountData.name,
        roleRef: serviceAccountData.roleRef,
        rules: serviceAccountData.rules
      }
    } else {
      // If service account doesn't exist, create default one or leave null
      // For now, we'll leave it null - the agent should handle this gracefully
      responseMicroservice.serviceAccount = null
    }

    response.push(responseMicroservice)
    await MicroserviceManager.update({
      uuid: microservice.uuid
    }, {
      rebuild: false
    }, transaction)
  }

  return {
    microservices: response
  }
}

const getAgentLinkedEdgeResources = async function (fog, transaction) {
  const edgeResources = []
  const resourceAttributes = [
    'id',
    'interfaceId',
    'name',
    'version',
    'description',
    'interfaceProtocol',
    'displayName',
    'displayIcon',
    'displayColor',
    'custom'
  ]
  const resources = await fog.getEdgeResources({ attributes: resourceAttributes })
  for (const resource of resources) {
    const intrface = await EdgeResourceService.getInterface(resource, transaction)
    // Transform Sequelize objects into plain JSON objects
    const resourceObject = { ...resource.toJSON(), interface: intrface.toJSON() }
    edgeResources.push(EdgeResourceService.buildGetObject(resourceObject))
  }
  return edgeResources
}

const getAgentMicroservice = async function (microserviceUuid, fog, transaction) {
  const microservice = await MicroserviceManager.findOneWithDependencies({
    uuid: microserviceUuid,
    iofogUuid: fog.uuid
  }, {}, transaction)

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  return {
    microservice: microservice
  }
}

const getAgentRegistries = async function (fog, transaction) {
  const registries = await RegistryManager.findAll({}, transaction)
  return {
    registries: registries
  }
}

const getAgentTunnel = async function (fog, transaction) {
  const tunnel = await TunnelManager.findOne({
    iofogUuid: fog.uuid
  }, transaction)

  if (!tunnel) {
    throw new Errors.NotFoundError(ErrorMessages.TUNNEL_NOT_FOUND)
  }

  return {
    tunnel: tunnel
  }
}

const getAgentStrace = async function (fog, transaction) {
  const fogWithStrace = await FogManager.findFogStraces({
    uuid: fog.uuid
  }, transaction)

  if (!fogWithStrace) {
    throw new Errors.NotFoundError(ErrorMessages.STRACE_NOT_FOUND)
  }

  const straceArr = []
  for (const msData of fogWithStrace.microservice) {
    straceArr.push({
      microserviceUuid: msData.strace.microserviceUuid,
      straceRun: msData.strace.straceRun
    })
  }

  return {
    straceValues: straceArr
  }
}

const updateAgentStrace = async function (straceData, fog, transaction) {
  await Validator.validate(straceData, Validator.schemas.updateAgentStrace)

  for (const strace of straceData.straceData) {
    const microserviceUuid = strace.microserviceUuid
    const buffer = strace.buffer
    await StraceManager.pushBufferByMicroserviceUuid(microserviceUuid, buffer, transaction)
  }
}

const getAgentChangeVersionCommand = async function (fog, transaction) {
  const versionCommand = await FogVersionCommandManager.findOne({
    iofogUuid: fog.uuid
  }, transaction)
  if (!versionCommand) {
    throw new Errors.NotFoundError(ErrorMessages.VERSION_COMMAND_NOT_FOUND)
  }

  const provision = await FogProvisionKeyManager.findOne({
    iofogUuid: fog.uuid
  }, transaction)

  return {
    versionCommand: versionCommand.versionCommand,
    provisionKey: provision.provisionKey,
    expirationTime: provision.expirationTime
  }
}

const updateHalHardwareInfo = async function (hardwareData, fog, transaction) {
  await Validator.validate(hardwareData, Validator.schemas.updateHardwareInfo)

  hardwareData.iofogUuid = fog.uuid

  await HWInfoManager.updateOrCreate({
    iofogUuid: fog.uuid
  }, hardwareData, transaction)
}

const updateHalUsbInfo = async function (usbData, fog, transaction) {
  await Validator.validate(usbData, Validator.schemas.updateUsbInfo)

  usbData.iofogUuid = fog.uuid

  await USBInfoManager.updateOrCreate({
    iofogUuid: fog.uuid
  }, usbData, transaction)
}

const deleteNode = async function (fog, transaction) {
  await FogManager.delete({
    uuid: fog.uuid
  }, transaction)
}

const getImageSnapshot = async function (fog, transaction) {
  const microservice = await MicroserviceManager.findOne({
    iofogUuid: fog.uuid,
    imageSnapshot: 'get_image'
  }, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.IMAGE_SNAPSHOT_NOT_FOUND)
  }

  return {
    uuid: microservice.uuid
  }
}

const putImageSnapshot = async function (req, fog, transaction) {
  const opts = {
    maxFieldsSize: 500 * 1024 * 1024,
    maxFileSize: 500 * 1024 * 1024
  }
  if (!req.headers['content-type'].includes('multipart/form-data')) {
    throw new Errors.ValidationError(ErrorMessages.INVALID_CONTENT_TYPE)
  }

  const form = new IncomingForm(opts)
  form.uploadDir = path.join(global.appRoot, '../') + 'data'
  if (!fs.existsSync(form.uploadDir)) {
    fs.mkdirSync(form.uploadDir)
  }
  await _saveSnapShot(req, form, fog, transaction)
  return {}
}

const _saveSnapShot = function (req, form, fog, transaction) {
  return new Promise((resolve, reject) => {
    form.parse(req, async function (error, fields, files) {
      if (error) {
        reject(new Errors.ValidationError(ErrorMessages.UPLOADED_FILE_NOT_FOUND))
        return
      }
      const file = files['upstream']
      if (file === undefined) {
        reject(new Errors.ValidationError(ErrorMessages.UPLOADED_FILE_NOT_FOUND))
        return
      }

      const filePath = file['path']

      const absolutePath = path.resolve(filePath)
      fs.renameSync(absolutePath, absolutePath + '.tar.gz')

      await MicroserviceManager.update({
        iofogUuid: fog.uuid,
        imageSnapshot: 'get_image'
      }, {
        imageSnapshot: absolutePath + '.tar.gz'
      }, transaction)

      resolve()
    })
  })
}

async function _checkMicroservicesFogType (fog, fogTypeId, transaction) {
  const where = {
    iofogUuid: fog.uuid
  }
  const microservices = await MicroserviceManager.findAllWithDependencies(where, {}, transaction)
  if (microservices) {
    const invalidMicroservices = []

    for (const microservice of microservices) {
      let exists = false
      const images = (microservice.images && microservice.images.length > 0) ? microservice.images : microservice.catalogItem.images
      for (const image of images) {
        if (image.fogTypeId === fogTypeId) {
          exists = true
          break
        }
      }

      if (!exists) {
        invalidMicroservices.push(microservice)
      }
    }

    if (invalidMicroservices.length > 0) {
      let errorMsg = ErrorMessages.INVALID_MICROSERVICES_FOG_TYPE
      for (const error of invalidMicroservices) {
        errorMsg = errorMsg + ' "' + error.name + '" microservice\n'
      }
      throw new Errors.ValidationError(errorMsg)
    }
  }
}

const getControllerCA = async function (fog, transaction) {
  const devMode = process.env.DEV_MODE || config.get('server.devMode')
  const sslCert = process.env.SSL_CERT || config.get('server.ssl.path.cert')
  const intermedKey = process.env.INTERMEDIATE_CERT || config.get('server.ssl.path.intermediateCert')
  const sslCertBase64 = config.get('server.ssl.base64.cert')
  const intermedKeyBase64 = config.get('server.ssl.base64.intermediateCert')
  const hasFileBasedSSL = !devMode && sslCert
  const hasBase64SSL = !devMode && sslCertBase64

  if (devMode) {
    throw new Errors.ValidationError('Controller is in development mode')
  }

  if (hasFileBasedSSL) {
    try {
      if (intermedKey) {
        // Check if intermediate certificate file exists before trying to read it
        if (fs.existsSync(intermedKey)) {
          const certData = fs.readFileSync(intermedKey, 'utf8')
          return Buffer.from(certData).toString('base64')
        } else {
          // Intermediate certificate file doesn't exist, don't provide any CA cert
          // Let the system's default trust store handle validation
          logger.info(`Intermediate certificate file not found at path: ${intermedKey}, not providing CA certificate`)
          return ''
        }
      } else {
        // No intermediate certificate path provided, don't provide any CA cert
        // Let the system's default trust store handle validation
        return ''
      }
    } catch (error) {
      throw new Errors.ValidationError('Failed to read SSL certificate file')
    }
  }

  if (hasBase64SSL) {
    if (intermedKeyBase64) {
      return intermedKeyBase64
    } else {
      // No intermediate certificate base64 provided, don't provide any CA cert
      // Let the system's default trust store handle validation
      return ''
    }
  }

  throw new Errors.ValidationError('No valid SSL certificate configuration found')
}

// New endpoint: Get active log sessions for agent
const getAgentLogSessions = async function (fog, transaction) {
  const Op = require('sequelize').Op

  // Get all microservices for this fog
  const microservices = await MicroserviceManager.findAll(
    { iofogUuid: fog.uuid },
    transaction
  )

  const allSessions = []

  // Get microservice log sessions
  for (const ms of microservices) {
    const sessions = await MicroserviceLogStatusManager.findAll(
      {
        microserviceUuid: ms.uuid,
        status: { [Op.in]: ['PENDING', 'ACTIVE'] }
      },
      transaction
    )

    for (const session of sessions) {
      allSessions.push({
        microserviceUuid: ms.uuid,
        sessionId: session.sessionId,
        tailConfig: JSON.parse(session.tailConfig),
        status: session.status,
        agentConnected: session.agentConnected
      })
    }
  }

  // Get fog node log sessions
  const fogSessions = await FogLogStatusManager.findAll(
    {
      iofogUuid: fog.uuid,
      status: { [Op.in]: ['PENDING', 'ACTIVE'] }
    },
    transaction
  )

  for (const session of fogSessions) {
    allSessions.push({
      iofogUuid: fog.uuid,
      sessionId: session.sessionId,
      tailConfig: JSON.parse(session.tailConfig),
      status: session.status,
      agentConnected: session.agentConnected
    })
  }

  return { logSessions: allSessions }
}

const getAgentLinkedVolumeMounts = async function (fog, transaction) {
  const volumeMounts = []
  const resourceAttributes = [
    'uuid',
    'name',
    'version',
    'configMapName',
    'secretName'
  ]
  const resources = await fog.getVolumeMounts({ attributes: resourceAttributes })
  for (const resource of resources) {
    const resourceObject = resource.toJSON()
    let data = {}
    let type = null

    if (resourceObject.configMapName) {
      // Handle ConfigMap
      type = 'configMap'
      const configMap = await ConfigMapManager.getConfigMap(resourceObject.configMapName, transaction)
      if (configMap) {
        // For configmaps, we need to base64 encode all values
        data = Object.entries(configMap.data).reduce((acc, [key, value]) => {
          acc[key] = Buffer.from(String(value)).toString('base64')
          return acc
        }, {})
      }
    } else if (resourceObject.secretName) {
      // Handle Secret
      type = 'secret'
      const secret = await SecretManager.getSecret(resourceObject.secretName, transaction)
      if (secret) {
        if (secret.type === 'tls') {
          // For TLS secrets, values are already base64 encoded
          data = secret.data
        } else {
          // For Opaque secrets, we need to base64 encode all values
          data = Object.entries(secret.data).reduce((acc, [key, value]) => {
            acc[key] = Buffer.from(String(value)).toString('base64')
            return acc
          }, {})
        }
      }
    }

    // Create final response object without configMapName and secretName
    const responseObject = {
      uuid: resourceObject.uuid,
      name: resourceObject.name,
      version: resourceObject.version,
      type: type,
      data: data
    }
    volumeMounts.push(responseObject)
  }
  return volumeMounts
}

module.exports = {
  agentProvision: TransactionDecorator.generateTransaction(agentProvision),
  agentDeprovision: TransactionDecorator.generateTransaction(agentDeprovision),
  getAgentConfig: TransactionDecorator.generateTransaction(getAgentConfig),
  updateAgentConfig: TransactionDecorator.generateTransaction(updateAgentConfig),
  updateAgentGpsEndPoint: TransactionDecorator.generateTransaction(updateAgentGpsEndPoint),
  getAgentConfigChanges: TransactionDecorator.generateTransaction(getAgentConfigChanges),
  resetAgentConfigChanges: TransactionDecorator.generateTransaction(resetAgentConfigChanges),
  updateAgentStatus: TransactionDecorator.generateTransaction(updateAgentStatus),
  getAgentMicroservices: TransactionDecorator.generateTransaction(getAgentMicroservices),
  getAgentMicroservice: TransactionDecorator.generateTransaction(getAgentMicroservice),
  getAgentRegistries: TransactionDecorator.generateTransaction(getAgentRegistries),
  getAgentTunnel: TransactionDecorator.generateTransaction(getAgentTunnel),
  getAgentStrace: TransactionDecorator.generateTransaction(getAgentStrace),
  updateAgentStrace: TransactionDecorator.generateTransaction(updateAgentStrace),
  getAgentChangeVersionCommand: TransactionDecorator.generateTransaction(getAgentChangeVersionCommand),
  updateHalHardwareInfo: TransactionDecorator.generateTransaction(updateHalHardwareInfo),
  updateHalUsbInfo: TransactionDecorator.generateTransaction(updateHalUsbInfo),
  deleteNode: TransactionDecorator.generateTransaction(deleteNode),
  getImageSnapshot: TransactionDecorator.generateTransaction(getImageSnapshot),
  putImageSnapshot: TransactionDecorator.generateTransaction(putImageSnapshot),
  getAgentLinkedEdgeResources: TransactionDecorator.generateTransaction(getAgentLinkedEdgeResources),
  getAgentLinkedVolumeMounts: TransactionDecorator.generateTransaction(getAgentLinkedVolumeMounts),
  getControllerCA: TransactionDecorator.generateTransaction(getControllerCA),
  getAgentLogSessions: TransactionDecorator.generateTransaction(getAgentLogSessions)
}
