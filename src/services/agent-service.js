/*
 * *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const path = require('path')
const fs = require('fs')
const formidable = require('formidable')
const Sequelize = require('sequelize')
const moment = require('moment')
const Op = Sequelize.Op

const TransactionDecorator = require('../decorators/transaction-decorator')
const FogProvisionKeyManager = require('../data/managers/iofog-provision-key-manager')
const FogManager = require('../data/managers/iofog-manager')
const FogAccessTokenService = require('../services/iofog-access-token-service')
const ChangeTrackingService = require('./change-tracking-service')
const FogVersionCommandManager = require('../data/managers/iofog-version-command-manager')
const StraceManager = require('../data/managers/strace-manager')
const RegistryManager = require('../data/managers/registry-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceStates = require('../enums/microservice-state')
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
const TrackingDecorator = require('../decorators/tracking-decorator')
const TrackingEventType = require('../enums/tracking-event-type')
const TrackingEventManager = require('../data/managers/tracking-event-manager')
const RouterManager = require('../data/managers/router-manager')
const EdgeResourceService = require('./edge-resource-service')
const constants = require('../helpers/constants')
const IncomingForm = formidable.IncomingForm
const CHANGE_TRACKING_DEFAULT = {}
const CHANGE_TRACKING_KEYS = ['config', 'version', 'reboot', 'deleteNode', 'microserviceList', 'microserviceConfig', 'routing', 'registries', 'tunnel', 'diagnostics', 'isImageSnapshot', 'prune', 'routerChanged', 'linkedEdgeResources']
for (const key of CHANGE_TRACKING_KEYS) {
  CHANGE_TRACKING_DEFAULT[key] = false
}

const agentProvision = async function (provisionData, transaction) {
  await Validator.validate(provisionData, Validator.schemas.agentProvision)

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

  await _checkMicroservicesFogType(fog, provisionData.type, transaction)

  const newAccessToken = await FogAccessTokenService.generateAccessToken(transaction)

  await FogAccessTokenService.updateAccessToken(fog.uuid, newAccessToken, transaction)

  await FogManager.update({
    uuid: fog.uuid
  }, {
    fogTypeId: provisionData.type
  }, transaction)

  await FogProvisionKeyManager.delete({
    provisionKey: provisionData.key
  }, transaction)

  return {
    uuid: fog.uuid,
    token: newAccessToken.token
  }
}

const agentDeprovision = async function (deprovisionData, fog, transaction) {
  await Validator.validate(deprovisionData, Validator.schemas.agentDeprovision)

  await MicroserviceStatusManager.update(
    { microserviceUuid: deprovisionData.microserviceUuids },
    { status: MicroserviceStates.DELETING },
    transaction
  )

  await _invalidateFogNode(fog, transaction)
}

const _invalidateFogNode = async function (fog, transaction) {
  const where = { uuid: fog.uuid }
  const data = { daemonStatus: FogStates.UNKNOWN, ipAddress: '0.0.0.0', ipAddressExternal: '0.0.0.0' }
  await FogManager.update(where, data, transaction)
  const updatedFog = Object.assign({}, fog)
  updatedFog.daemonStatus = FogStates.UNKNOWN
  updatedFog.ipAddress = '0.0.0.0'
  updatedFog.ipAddressExternal = '0.0.0.0'
  return updatedFog
}

const getAgentConfig = async function (fog, transaction) {
  const router = fog.routerId ? await RouterManager.findOne({ id: fog.routerId }, transaction) : await fog.getRouter()
  // fog is the result of FogManager.FindOne() in the checkFogToken middleware
  return {
    networkInterface: fog.networkInterface,
    dockerUrl: fog.dockerUrl,
    diskLimit: fog.diskLimit,
    diskDirectory: fog.diskDirectory,
    memoryLimit: fog.memoryLimit,
    cpuLimit: fog.cpuLimit,
    logLimit: fog.logLimit,
    logDirectory: fog.logDirectory,
    logFileCount: fog.logFileCount,
    statusFrequency: fog.statusFrequency,
    changeFrequency: fog.changeFrequency,
    deviceScanFrequency: fog.deviceScanFrequency,
    watchdogEnabled: fog.watchdogEnabled,
    latitude: fog.latitude,
    longitude: fog.longitude,
    logLevel: fog.logLevel,
    availableDiskThreshold: fog.availableDiskThreshold,
    dockerPruningFrequency: fog.dockerPruningFrequency,
    routerHost: router.host === fog.host ? 'localhost' : router.host,
    routerPort: router.messagingPort
  }
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
    dockerPruningFrequency: updateData.dockerPruningFrequency,
    availableDiskThreshold: updateData.availableDiskThreshold,
    logLevel: updateData.logLevel
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
    isReadyToRollback: agentStatus.isReadyToRollback
  }

  fogStatus = AppHelper.deleteUndefinedFields(fogStatus)

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
      startTime: status.startTime,
      operatingDuration: status.operatingDuration,
      cpuUsage: status.cpuUsage,
      memoryUsage: status.memoryUsage,
      percentage: status.percentage,
      errorMessage: status.errorMessage
    }
    microserviceStatus = AppHelper.deleteUndefinedFields(microserviceStatus)
    const microservice = await MicroserviceManager.findOne({
      uuid: status.id
    }, transaction)
    if (fog.uuid === microservice.iofogUuid) {
      await MicroserviceStatusManager.update({
        microserviceUuid: status.id
      }, microserviceStatus, transaction)
    }
  }
}

const _mapExtraHost = function (extraHost) {
  return `${extraHost.name}:${extraHost.value}`
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

    const routes = await MicroserviceService.getReceiverMicroservices(microservice, transaction)
    const isConsumer = await MicroserviceService.isMicroserviceConsumer(microservice, transaction)

    const env = microservice.env && microservice.env.map((it) => {
      return {
        key: it.key,
        value: it.value
      }
    })
    const cmd = microservice.cmd && microservice.cmd.sort((a, b) => a.id - b.id).map((it) => it.cmd)

    const registryId = microservice.catalogItem && microservice.catalogItem.registry ? microservice.catalogItem.registry.id : microservice.registry.id

    const extraHosts = microservice.extraHosts ? microservice.extraHosts.map(_mapExtraHost) : []

    const responseMicroservice = {
      uuid: microservice.uuid,
      imageId: imageId,
      config: microservice.config,
      rebuild: microservice.rebuild,
      rootHostAccess: microservice.rootHostAccess,
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
      routes,
      isConsumer
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
  const registries = await RegistryManager.findAll({
    [Op.or]:
      [
        {
          userId: fog.userId
        },
        {
          isPublic: true
        }
      ]
  }, transaction)
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

async function postTracking (events, fog, transaction) {
  await Validator.validate(events, Validator.schemas.trackingArray)
  for (const event of events) {
    event.data = JSON.stringify(event.data)
  }

  await TrackingEventManager.bulkCreate(events, transaction)
}

// decorated functions
const agentProvisionWithTracking = TrackingDecorator.trackEvent(agentProvision, TrackingEventType.IOFOG_PROVISION)

module.exports = {
  agentProvision: TransactionDecorator.generateTransaction(agentProvisionWithTracking),
  agentDeprovision: TransactionDecorator.generateTransaction(agentDeprovision),
  getAgentConfig: TransactionDecorator.generateTransaction(getAgentConfig),
  updateAgentConfig: TransactionDecorator.generateTransaction(updateAgentConfig),
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
  postTracking: TransactionDecorator.generateTransaction(postTracking),
  getAgentLinkedEdgeResources: TransactionDecorator.generateTransaction(getAgentLinkedEdgeResources)
}
