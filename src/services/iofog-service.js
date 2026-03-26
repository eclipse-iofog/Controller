/*
 *  *******************************************************************************
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
const fs = require('fs')
const TransactionDecorator = require('../decorators/transaction-decorator')
const AppHelper = require('../helpers/app-helper')
const FogManager = require('../data/managers/iofog-manager')
const FogProvisionKeyManager = require('../data/managers/iofog-provision-key-manager')
const FogKeyService = require('./iofog-key-service')
const FogVersionCommandManager = require('../data/managers/iofog-version-command-manager')
const ChangeTrackingService = require('./change-tracking-service')
const NatsService = require('./nats-service')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const Validator = require('../schemas')
const HWInfoManager = require('../data/managers/hw-info-manager')
const USBInfoManager = require('../data/managers/usb-info-manager')
const CatalogService = require('./catalog-service')
const MicroserviceManager = require('../data/managers/microservice-manager')
const ApplicationManager = require('../data/managers/application-manager')
const TagsManager = require('../data/managers/tags-manager')
const MicroserviceService = require('./microservices-service')
const EdgeResourceService = require('./edge-resource-service')
const RouterManager = require('../data/managers/router-manager')
const MicroserviceExtraHostManager = require('../data/managers/microservice-extra-host-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const RouterConnectionManager = require('../data/managers/router-connection-manager')
const NatsInstanceManager = require('../data/managers/nats-instance-manager')
const NatsConnectionManager = require('../data/managers/nats-connection-manager')
const CatalogItemImageManager = require('../data/managers/catalog-item-image-manager')
const RouterService = require('./router-service')
const {
  ensureSystemApplication,
  getLegacySystemAppName,
  getSystemAppName,
  getSystemMicroserviceName
} = require('../helpers/system-naming')
const Constants = require('../helpers/constants')
const Op = require('sequelize').Op
const lget = require('lodash/get')
const CertificateService = require('./certificate-service')
const logger = require('../logger')
const ServiceManager = require('../data/managers/service-manager')
const FogStates = require('../enums/fog-state')
const SecretManager = require('../data/managers/secret-manager')
const vaultManager = require('../vault/vault-manager')
const SecretHelper = require('../helpers/secret-helper')
const FogPublicKeyManager = require('../data/managers/iofog-public-key-manager')

const SITE_CA_CERT = 'router-site-ca'
const DEFAULT_ROUTER_LOCAL_CA = 'default-router-local-ca'
const SERVICE_ANNOTATION_TAG = 'service.iofog.org/tag'

async function checkKubernetesEnvironment () {
  const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')
  return controlPlane && controlPlane.toLowerCase() === 'kubernetes'
}

async function getLocalCertificateHosts (fogData) {
  const hosts = new Set()
  const defaultHost = ['localhost', '127.0.0.1', 'host.docker.internal', 'host.containers.internal', 'iofog', 'service.local']
  // Add default hosts individually
  defaultHost.forEach(host => hosts.add(host))
  if (fogData.host) hosts.add(fogData.host)
  if (fogData.ipAddress) hosts.add(fogData.ipAddress)
  if (fogData.ipAddressExternal) hosts.add(fogData.ipAddressExternal)
  // if (isKubernetes) {
  //   return `router-local,router-local.${namespace},router-local.${namespace}.svc.cluster.local,127.0.0.1,localhost,host.docker.internal,host.containers.internal`
  // }
  return Array.from(hosts).join(',') || 'localhost'
}

async function getSiteCertificateHosts (fogData) {
  const hosts = new Set()
  // const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  // const isFogDefaultRouter = fogUuid === defaultRouter.iofogUuid
  // // Add existing hosts if isSystem and fog is default-router
  // if (fogData.isSystem && isFogDefaultRouter) {
  //   if (fogData.host) hosts.add(fogData.host)
  //   if (fogData.ipAddress) hosts.add(fogData.ipAddress)
  //   if (fogData.ipAddressExternal) hosts.add(fogData.ipAddressExternal)
  // }
  // // Add default router host if not system or fog isSystem but not default-router
  // if (!fogData.isSystem || (fogData.isSystem && !isFogDefaultRouter)) {
  //   // const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  //   if (defaultRouter.host) hosts.add(defaultRouter.host)
  // }
  // Add upstream router hosts
  // const upstreamRouters = (fogData.upstreamRouters || []).filter(uuid => uuid !== 'default-router')
  // if (upstreamRouters.length) {
  //   for (const uuid of upstreamRouters) {
  //     const routerHost = await FogManager.findOne({ uuid: uuid }, transaction)
  //     if (routerHost.host) hosts.add(routerHost.host)
  //     if (routerHost.ipAddress) hosts.add(routerHost.ipAddress)
  //   }
  // }
  if (fogData.host) hosts.add(fogData.host)
  if (fogData.ipAddress) hosts.add(fogData.ipAddress)
  if (fogData.ipAddressExternal) hosts.add(fogData.ipAddressExternal)
  return Array.from(hosts).join(',') || 'localhost'
}

async function _handleRouterCertificates (fogData, uuid, isRouterModeChanged, transaction) {
  logger.debug('Starting _handleRouterCertificates for fog: ' + JSON.stringify({ uuid: uuid, host: fogData.host }))

  // Check if we're in Kubernetes environment
  const isKubernetes = await checkKubernetesEnvironment()
  // const namespace = isKubernetes ? process.env.CONTROLLER_NAMESPACE : null

  // Helper to check CA existence
  async function ensureCA (name, subject) {
    logger.debug('Checking CA existence: ' + JSON.stringify({ name, subject }))
    try {
      await CertificateService.getCAEndpoint(name, transaction)
      logger.debug('CA already exists: ' + name)
      // CA exists
    } catch (err) {
      if (err.name === 'NotFoundError') {
        logger.debug('CA not found, creating new CA: ' + JSON.stringify({ name, subject }))
        await CertificateService.createCAEndpoint({
          name,
          subject: `${subject}`,
          expiration: 60, // months
          type: 'self-signed'
        }, transaction)
        logger.debug('Successfully created CA: ' + name)
      } else if (err.name === 'ConflictError') {
        logger.debug('CA already exists (conflict): ' + name)
        // Already exists, ignore
      } else {
        logger.error('Error in ensureCA - Name: ' + name + ', Subject: ' + subject + ', Error: ' + err.message + ', Type: ' + err.name + ', Code: ' + err.code)
        logger.error('Stack trace: ' + err.stack)
        throw err
      }
    }
  }

  // Helper to check cert existence
  async function ensureCert (name, subject, hosts, ca, shouldRecreate = false) {
    logger.debug('Checking certificate existence: ' + JSON.stringify({ name, subject, hosts, ca }))
    try {
      const existingCert = await CertificateService.getCertificateEndpoint(name, transaction)
      if (shouldRecreate && existingCert) {
        logger.debug('Certificate exists and needs recreation: ' + name)
        await CertificateService.deleteCertificateEndpoint(name, transaction)
        logger.debug('Deleted existing certificate: ' + name)
        // Create new certificate
        await CertificateService.createCertificateEndpoint({
          name,
          subject: `${subject}`,
          hosts,
          ca
        }, transaction)
        logger.debug('Successfully recreated certificate: ' + name)
      } else if (!existingCert) {
        logger.debug('Certificate not found, creating new certificate: ' + JSON.stringify({ name, subject, hosts, ca }))
        await CertificateService.createCertificateEndpoint({
          name,
          subject: `${subject}`,
          hosts,
          ca
        }, transaction)
        logger.debug('Successfully created certificate: ' + name)
      } else {
        logger.debug('Certificate already exists: ' + name)
      }
    } catch (err) {
      if (err.name === 'NotFoundError') {
        logger.debug('Certificate not found, creating new certificate: ' + JSON.stringify({ name, subject, hosts, ca }))
        await CertificateService.createCertificateEndpoint({
          name,
          subject: `${subject}`,
          hosts,
          ca
        }, transaction)
        logger.debug('Successfully created certificate: ' + name)
      } else if (err.name === 'ConflictError') {
        logger.debug('Certificate already exists (conflict): ' + name)
        // Already exists, ignore
      } else {
        logger.error('Error in ensureCert - Name: ' + name + ', Subject: ' + subject + ', Hosts: ' + hosts + ', CA: ' + JSON.stringify(ca) + ', Error: ' + err.message + ', Type: ' + err.name + ', Code: ' + err.code)
        logger.error('Stack trace: ' + err.stack)
        throw err
      }
    }
  }

  try {
    // Always ensure SITE_CA_CERT exists
    logger.debug('Ensuring SITE_CA_CERT exists')
    await ensureCA(SITE_CA_CERT, SITE_CA_CERT)

    // If routerMode is 'none', only ensure DEFAULT_ROUTER_LOCAL_CA and its signed certificate
    if (fogData.routerMode === 'none') {
      logger.debug('Router mode is none, ensuring DEFAULT_ROUTER_LOCAL_CA exists')
      if (isKubernetes) {
        await ensureCA(DEFAULT_ROUTER_LOCAL_CA, DEFAULT_ROUTER_LOCAL_CA)
      }
      logger.debug('Ensuring local-agent certificate signed by DEFAULT_ROUTER_LOCAL_CA')
      const localHosts = await getLocalCertificateHosts(fogData)
      let defaultRouterLocalCA
      if (isKubernetes) {
        defaultRouterLocalCA = DEFAULT_ROUTER_LOCAL_CA
      } else {
        const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
        defaultRouterLocalCA = `${defaultRouter.iofogUuid}-local-ca`
      }

      await ensureCert(
        `router-local-agent-${fogData.name}`,
        `${uuid}`,
        localHosts,
        { type: 'direct', secretName: defaultRouterLocalCA },
        isRouterModeChanged
      )
      logger.debug('Successfully completed _handleRouterCertificates for routerMode none')
      return
    }

    // For other router modes, ensure all other certificates
    // Always ensure site-server cert exists
    logger.debug('Ensuring site-server certificate exists')
    const siteHosts = await getSiteCertificateHosts(fogData)
    await ensureCert(
      `router-site-server-${fogData.name}`,
      `${uuid}`,
      siteHosts,
      { type: 'direct', secretName: SITE_CA_CERT },
      false
    )

    // Always ensure local-ca exists
    logger.debug('Ensuring local-ca exists')
    await ensureCA(`router-local-ca-${fogData.name}`, `${uuid}`)

    // Always ensure local-server cert exists
    logger.debug('Ensuring local-server certificate exists')
    const localHosts = await getLocalCertificateHosts(fogData)
    await ensureCert(
      `router-local-server-${fogData.name}`,
      `${uuid}`,
      localHosts,
      { type: 'direct', secretName: `router-local-ca-${fogData.name}` },
      isRouterModeChanged
    )

    // Always ensure local-agent cert exists
    logger.debug('Ensuring local-agent certificate exists')
    await ensureCert(
      `router-local-agent-${fogData.name}`,
      `${uuid}`,
      localHosts,
      { type: 'direct', secretName: `router-local-ca-${fogData.name}` },
      isRouterModeChanged
    )

    logger.debug('Successfully completed _handleRouterCertificates')
  } catch (error) {
    logger.error('Certificate operation failed - UUID: ' + uuid + ', RouterMode: ' + fogData.routerMode + ', Error: ' + error.message + ', Type: ' + error.name + ', Code: ' + error.code)
    logger.error('Stack trace: ' + error.stack)
  }
}

async function createFogEndPoint (fogData, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogCreate)
  const isKubernetes = await checkKubernetesEnvironment()
  if (isKubernetes && fogData.isSystem) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_SYSTEM_FOG_KUBERNETES))
  }
  let createFogData = {
    uuid: AppHelper.generateUUID(),
    name: fogData.name,
    location: fogData.location,
    latitude: fogData.latitude,
    longitude: fogData.longitude,
    // gpsMode: fogData.latitude || fogData.longitude ? 'manual' : undefined,
    description: fogData.description,
    networkInterface: fogData.networkInterface,
    dockerUrl: fogData.dockerUrl,
    containerEngine: fogData.containerEngine,
    deploymentType: fogData.deploymentType,
    diskLimit: fogData.diskLimit,
    diskDirectory: fogData.diskDirectory,
    memoryLimit: fogData.memoryLimit,
    cpuLimit: fogData.cpuLimit,
    logLimit: fogData.logLimit,
    logDirectory: fogData.logDirectory,
    logFileCount: fogData.logFileCount,
    statusFrequency: fogData.statusFrequency,
    changeFrequency: fogData.changeFrequency,
    deviceScanFrequency: fogData.deviceScanFrequency,
    bluetoothEnabled: fogData.bluetoothEnabled,
    watchdogEnabled: fogData.watchdogEnabled,
    abstractedHardwareEnabled: fogData.abstractedHardwareEnabled,
    fogTypeId: fogData.fogType,
    logLevel: fogData.logLevel,
    edgeGuardFrequency: fogData.edgeGuardFrequency,
    dockerPruningFrequency: fogData.dockerPruningFrequency,
    availableDiskThreshold: fogData.availableDiskThreshold,
    isSystem: fogData.isSystem,
    host: fogData.host,
    routerId: null,
    timeZone: fogData.timeZone
  }

  if ((fogData.latitude || fogData.longitude) && (fogData.gpsMode !== 'dynamic' && fogData.gpsMode !== 'off')) {
    createFogData.gpsMode = 'manual'
  } else if (fogData.gpsMode === 'dynamic' && fogData.gpsDevice) {
    createFogData.gpsMode = fogData.gpsMode
    createFogData.gpsDevice = fogData.gpsDevice
  } else if (!(fogData.latitude || fogData.longitude) && fogData.gpsMode === 'auto') {
    createFogData.gpsMode = 'auto'
  } else if (fogData.gpsMode === 'off') {
    createFogData.gpsMode = 'off'
  } else {
    createFogData.gpsMode = undefined
  }

  createFogData = AppHelper.deleteUndefinedFields(createFogData)

  // Default router is edge
  fogData.routerMode = fogData.routerMode || 'edge'

  if (fogData.isSystem && fogData.routerMode !== 'interior') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER_MODE, fogData.routerMode))
  }

  if (fogData.isSystem && fogData.natsMode !== 'server') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_NATS_MODE, fogData.natsMode))
  }

  // // TODO: handle multiple system fogs a.k.a multi-remote-controller and multi interior routers
  // if (fogData.isSystem && !!(await FogManager.findOne({ isSystem: true }, transaction))) {
  //   throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_SYSTEM_FOG))
  // }

  const existingFog = await FogManager.findOne({ name: createFogData.name }, transaction)
  if (existingFog) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, createFogData.name))
  }

  let defaultRouter, upstreamRouters
  if (fogData.routerMode === 'none') {
    const networkRouter = await RouterService.getNetworkRouter(fogData.networkRouter)
    if (!networkRouter) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, !fogData.networkRouter ? Constants.DEFAULT_ROUTER_NAME : fogData.networkRouter))
    }
    createFogData.routerId = networkRouter.id
  } else {
    defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
    upstreamRouters = await RouterService.validateAndReturnUpstreamRouters(fogData.upstreamRouters, fogData.isSystem, defaultRouter)
  }

  const fog = await FogManager.create(createFogData, transaction)

  // Set tags (synchronously, as this is a simple DB op)
  await _setTags(fog, fogData.tags, transaction)

  // Return fog UUID immediately
  const res = { uuid: fog.uuid }

  const natsConfig = {
    mode: fogData.natsMode || 'leaf',
    serverPort: fogData.natsServerPort,
    leafPort: fogData.natsLeafPort,
    clusterPort: fogData.natsClusterPort,
    mqttPort: fogData.natsMqttPort,
    httpPort: fogData.natsHttpPort,
    jsStorageSize: fogData.jsStorageSize || NatsService.DEFAULT_JS_STORAGE_SIZE,
    jsMemoryStoreSize: fogData.jsMemoryStoreSize || NatsService.DEFAULT_JS_MEMORY_STORE_SIZE
  }

  if (fogData.upstreamNatsServers) {
    natsConfig.upstreamNatsServers = fogData.upstreamNatsServers
  }

  // Start background orchestration
  setImmediate(() => {
    (async () => {
      const transaction = { fakeTransaction: true }
      try {
        // --- Begin orchestration logic (previously inside runWithRetries) ---
        await _handleRouterCertificates({ ...fogData, name: fog.name }, fog.uuid, false, transaction)
        await NatsService.ensureNatsForFog(fog, natsConfig, transaction)

        if (fogData.routerMode !== 'none') {
          if (!fogData.host && !isCLI) {
            throw new Errors.ValidationError(ErrorMessages.HOST_IS_REQUIRED)
          }
          await RouterService.createRouterForFog(fogData, fog.uuid, upstreamRouters)

          // Service Distribution Logic
          const serviceTags = await _extractServiceTags(fogData.tags)
          if (serviceTags.length > 0) {
            const services = await _findMatchingServices(serviceTags, transaction)
            if (services.length > 0) {
              const application = await ensureSystemApplication(fog, transaction)
              const routerName = getSystemMicroserviceName('router')
              const routerMicroservice = await MicroserviceManager.findOne({
                name: routerName,
                applicationId: application.id
              }, transaction)
              if (!routerMicroservice) {
                throw new Errors.NotFoundError(`Router microservice not found: ${routerName}`)
              }
              let config = JSON.parse(routerMicroservice.config || '{}')
              for (const service of services) {
                const listenerConfig = _buildTcpListenerForFog(service, fog.uuid)
                config = _mergeTcpListener(config, listenerConfig)
              }
              await MicroserviceManager.update(
                { uuid: routerMicroservice.uuid },
                { config: JSON.stringify(config) },
                transaction
              )
              await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.microserviceConfig, transaction)
            }
          }
        }

        await ChangeTrackingService.create(fog.uuid, transaction)
        if (fogData.abstractedHardwareEnabled) {
          await _createHalMicroserviceForFog(fog, null, transaction)
        }
        if (fogData.bluetoothEnabled) {
          await _createBluetoothMicroserviceForFog(fog, null, transaction)
        }
        await ChangeTrackingService.update(createFogData.uuid, ChangeTrackingService.events.microserviceCommon, transaction)
        // --- End orchestration logic ---
        // Set fog node as healthy
        await FogManager.update({ uuid: fog.uuid }, { warningMessage: 'HEALTHY' }, transaction)
      } catch (err) {
        logger.error('Background orchestration failed in createFogEndPoint: ' + err.message)
        // Set fog node as warning with error message
        await FogManager.update(
          { uuid: fog.uuid },
          {
            daemonStatus: FogStates.WARNING,
            warningMessage: `Background orchestration error: ${err.message}`
          },
          transaction
        )
      }
    })()
  })

  return res
}

async function _setTags (fogModel, tagsArray, transaction) {
  if (tagsArray) {
    let tags = []
    for (const tag of tagsArray) {
      let tagModel = await TagsManager.findOne({ value: tag }, transaction)
      if (!tagModel) {
        tagModel = await TagsManager.create({ value: tag }, transaction)
      }
      tags.push(tagModel)
    }
    await fogModel.setTags(tags)
  }
}

async function updateFogEndPoint (fogData, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogUpdate)

  const queryFogData = { uuid: fogData.uuid }

  let updateFogData = {
    name: fogData.name,
    location: fogData.location,
    latitude: fogData.latitude,
    longitude: fogData.longitude,
    // gpsMode: fogData.latitude || fogData.longitude ? 'manual' : undefined,
    description: fogData.description,
    networkInterface: fogData.networkInterface,
    dockerUrl: fogData.dockerUrl,
    containerEngine: fogData.containerEngine,
    deploymentType: fogData.deploymentType,
    diskLimit: fogData.diskLimit,
    diskDirectory: fogData.diskDirectory,
    memoryLimit: fogData.memoryLimit,
    cpuLimit: fogData.cpuLimit,
    logLimit: fogData.logLimit,
    logDirectory: fogData.logDirectory,
    logFileCount: fogData.logFileCount,
    statusFrequency: fogData.statusFrequency,
    changeFrequency: fogData.changeFrequency,
    deviceScanFrequency: fogData.deviceScanFrequency,
    bluetoothEnabled: fogData.bluetoothEnabled,
    watchdogEnabled: fogData.watchdogEnabled,
    isSystem: fogData.isSystem,
    abstractedHardwareEnabled: fogData.abstractedHardwareEnabled,
    fogTypeId: fogData.fogType,
    logLevel: fogData.logLevel,
    dockerPruningFrequency: fogData.dockerPruningFrequency,
    edgeGuardFrequency: fogData.edgeGuardFrequency,
    host: fogData.host,
    availableDiskThreshold: fogData.availableDiskThreshold,
    timeZone: fogData.timeZone
  }

  if ((fogData.latitude || fogData.longitude) && (fogData.gpsMode !== 'dynamic' && fogData.gpsMode !== 'off')) {
    updateFogData.gpsMode = 'manual'
  } else if (fogData.gpsMode === 'dynamic' && fogData.gpsDevice) {
    updateFogData.gpsMode = fogData.gpsMode
    updateFogData.gpsDevice = fogData.gpsDevice
  } else if (!(fogData.latitude || fogData.longitude) && fogData.gpsMode === 'auto') {
    updateFogData.gpsMode = 'auto'
  } else if (fogData.gpsMode === 'off') {
    updateFogData.gpsMode = 'off'
  } else {
    updateFogData.gpsMode = undefined
  }
  updateFogData = AppHelper.deleteUndefinedFields(updateFogData)

  const oldFog = await FogManager.findOne(queryFogData, transaction)
  if (!oldFog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }
  if (updateFogData.name && updateFogData.name !== oldFog.name) {
    throw new Errors.ValidationError('Agent Resource Name is immutable')
  }

  if (updateFogData.isSystem && updateFogData.natsMode !== 'server') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_NATS_MODE, updateFogData.natsMode))
  }

  if (updateFogData.isSystem && updateFogData.routerMode !== 'interior') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER_MODE, updateFogData.routerMode))
  }

  if (updateFogData.isSystem !== undefined && updateFogData.isSystem !== oldFog.isSystem) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_SYSTEM_CHANGE))
  }

  // Prevent overwriting detected fogType (1 or 2) with "auto" (0)
  // If fogType is being set to "auto" (0) but the agent has already detected its type (1 or 2),
  // preserve the detected type to ensure getAgentMicroservices can find matching images
  if (fogData.fogType === 0 && (oldFog.fogTypeId === 1 || oldFog.fogTypeId === 2)) {
    updateFogData.fogTypeId = undefined
    // Remove undefined fields again after modifying updateFogData
    updateFogData = AppHelper.deleteUndefinedFields(updateFogData)
  }

  // Update tags
  await _setTags(oldFog, fogData.tags, transaction)

  if (updateFogData.name) {
    const conflictQuery = isCLI
      ? { name: updateFogData.name, uuid: { [Op.not]: fogData.uuid } }
      : { name: updateFogData.name, uuid: { [Op.not]: fogData.uuid } }
    const conflict = await FogManager.findOne(conflictQuery, transaction)
    if (conflict) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, updateFogData.name))
    }
  }

  // Get all router config informations
  const router = await oldFog.getRouter()
  const host = fogData.host || lget(router, 'host')
  const upstreamRoutersConnections = router ? (await RouterConnectionManager.findAllWithRouters({ sourceRouter: router.id }, transaction) || []) : []
  const upstreamRoutersIofogUuid = fogData.upstreamRouters || await Promise.all(upstreamRoutersConnections.map(connection => connection.dest.iofogUuid))
  const routerMode = fogData.routerMode || (router ? (router.isEdge ? 'edge' : 'interior') : 'none')
  const messagingPort = fogData.messagingPort || (router ? router.messagingPort : null)
  const interRouterPort = fogData.interRouterPort || (router ? router.interRouterPort : null)
  const edgeRouterPort = fogData.edgeRouterPort || (router ? router.edgeRouterPort : null)
  let networkRouter

  const isSystem = updateFogData.isSystem === undefined ? oldFog.isSystem : updateFogData.isSystem
  if (isSystem && routerMode !== 'interior') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER_MODE, fogData.routerMode))
  }

  let isRouterModeChanged = false
  const oldRouterMode = (router ? (router.isEdge ? 'edge' : 'interior') : 'none')
  if (fogData.routerMode && fogData.routerMode !== oldRouterMode) {
    if (fogData.routerMode === 'none' || oldRouterMode === 'none') {
      isRouterModeChanged = true
    }
  }

  await FogManager.update(queryFogData, updateFogData, transaction)
  await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.config, transaction)

  // Return immediately
  const res = { uuid: fogData.uuid }

  const natsConfig = {
    mode: fogData.natsMode,
    serverPort: fogData.natsServerPort,
    leafPort: fogData.natsLeafPort,
    clusterPort: fogData.natsClusterPort,
    mqttPort: fogData.natsMqttPort,
    httpPort: fogData.natsHttpPort,
    upstreamNatsServers: fogData.upstreamNatsServers,
    jsStorageSize: fogData.jsStorageSize,
    jsMemoryStoreSize: fogData.jsMemoryStoreSize
  }

  // Start background orchestration
  setImmediate(() => {
    (async () => {
      const transaction = { fakeTransaction: true }
      try {
        // --- Begin orchestration logic ---
        const fog = await FogManager.findOne({ uuid: fogData.uuid }, transaction)
        await _handleRouterCertificates({ ...fogData, name: fog.name }, fog.uuid, isRouterModeChanged, transaction)
        if (natsConfig.mode === 'none') {
          await NatsService.cleanupNatsForFog(fog, transaction)
          await _deleteNatsMicroserviceByFog(fogData, transaction)
          await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.microserviceList, transaction)
        } else {
          await NatsService.ensureNatsForFog(fog, natsConfig, transaction)
        }

        if (routerMode === 'none') {
          networkRouter = await RouterService.getNetworkRouter(fogData.networkRouter)
          if (!networkRouter) {
            throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, !fogData.networkRouter ? Constants.DEFAULT_ROUTER_NAME : fogData.networkRouter))
          }
          if (router) {
            await _deleteFogRouter(fogData, transaction)
          }
        } else {
          const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
          const upstreamRouters = await RouterService.validateAndReturnUpstreamRouters(upstreamRoutersIofogUuid, oldFog.isSystem, defaultRouter)
          if (!router) {
            networkRouter = await RouterService.createRouterForFog(fogData, oldFog.uuid, upstreamRouters)
            // --- Service Distribution Logic ---
            const serviceTags = await _extractServiceTags(fogData.tags)
            if (serviceTags.length > 0) {
              const services = await _findMatchingServices(serviceTags, transaction)
              if (services.length > 0) {
                const application = await ensureSystemApplication(oldFog, transaction)
                const routerName = getSystemMicroserviceName('router')
                const routerMicroservice = await MicroserviceManager.findOne({
                  name: routerName,
                  applicationId: application.id
                }, transaction)
                if (!routerMicroservice) {
                  throw new Errors.NotFoundError(`Router microservice not found: ${routerName}`)
                }
                let config = JSON.parse(routerMicroservice.config || '{}')
                for (const service of services) {
                  const listenerConfig = _buildTcpListenerForFog(service, fogData.uuid)
                  config = _mergeTcpListener(config, listenerConfig)
                }
                await MicroserviceManager.update(
                  { uuid: routerMicroservice.uuid },
                  { config: JSON.stringify(config) },
                  transaction
                )
                await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.microserviceConfig, transaction)
              }
            }
          } else {
            const existingConnectors = await _extractExistingTcpConnectors(fogData.uuid, transaction)
            networkRouter = await RouterService.updateRouter(router, {
              messagingPort, interRouterPort, edgeRouterPort, isEdge: routerMode === 'edge', host
            }, upstreamRouters, fogData.containerEngine)
            // --- Service Distribution Logic ---
            const serviceTags = await _extractServiceTags(fogData.tags)
            const application = await ensureSystemApplication(oldFog, transaction)
            const routerName = getSystemMicroserviceName('router')
            const routerMicroservice = await MicroserviceManager.findOne({
              name: routerName,
              applicationId: application.id
            }, transaction)
            if (!routerMicroservice) {
              throw new Errors.NotFoundError(`Router microservice not found: ${routerName}`)
            }
            let config = JSON.parse(routerMicroservice.config || '{}')
            if (serviceTags.length > 0) {
              const services = await _findMatchingServices(serviceTags, transaction)
              if (services.length > 0) {
                for (const service of services) {
                  const listenerConfig = _buildTcpListenerForFog(service, fogData.uuid)
                  config = _mergeTcpListener(config, listenerConfig)
                }
              }
            }
            // Merge back existing connectors if any
            if (existingConnectors && Object.keys(existingConnectors).length > 0) {
              for (const connectorName in existingConnectors) {
                const connectorObj = existingConnectors[connectorName]
                config = _mergeTcpConnector(config, connectorObj)
              }
            }
            await MicroserviceManager.update(
              { uuid: routerMicroservice.uuid },
              { config: JSON.stringify(config) },
              transaction
            )
            await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.microserviceConfig, transaction)
            await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.routerChanged, transaction)
          }
        }
        updateFogData.routerId = networkRouter.id

        // If router changed, set routerChanged flag
        if (updateFogData.routerId !== oldFog.routerId || updateFogData.routerMode !== oldFog.routerMode) {
          await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.routerChanged, transaction)
          await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.microserviceList, transaction)
        }

        let msChanged = false
        if (updateFogData.host && updateFogData.host !== oldFog.host) {
          await _updateMicroserviceExtraHosts(fogData.uuid, updateFogData.host, transaction)
        }
        if (oldFog.abstractedHardwareEnabled === true && fogData.abstractedHardwareEnabled === false) {
          await _deleteHalMicroserviceByFog(fogData, transaction)
          msChanged = true
        }
        if (oldFog.abstractedHardwareEnabled === false && fogData.abstractedHardwareEnabled === true) {
          await _createHalMicroserviceForFog(fogData, oldFog, transaction)
          msChanged = true
        }
        if (oldFog.bluetoothEnabled === true && fogData.bluetoothEnabled === false) {
          await _deleteBluetoothMicroserviceByFog(fogData, transaction)
          msChanged = true
        }
        if (oldFog.bluetoothEnabled === false && fogData.bluetoothEnabled === true) {
          await _createBluetoothMicroserviceForFog(fogData, oldFog, transaction)
          msChanged = true
        }
        if (msChanged) {
          await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.microserviceCommon, transaction)
        }
        // --- End orchestration logic ---
        // Set fog node as healthy
        await FogManager.update({ uuid: fogData.uuid }, { warningMessage: 'HEALTHY' }, transaction)
      } catch (err) {
        logger.error('Background orchestration failed in updateFogEndPoint: ' + err.message, {
          stack: err.stack
        })
        await FogManager.update(
          { uuid: fogData.uuid },
          {
            daemonStatus: FogStates.WARNING,
            warningMessage: `Background orchestration error: ${err.message}`
          },
          transaction
        )
      }
    })()
  })

  // Return immediately
  return res
}

async function _updateMicroserviceExtraHosts (fogUuid, host, transaction) {
  const microserviceExtraHosts = await MicroserviceExtraHostManager.findAll({ targetFogUuid: fogUuid }, transaction)
  for (const extraHost of microserviceExtraHosts) {
    extraHost.value = host
    await extraHost.save()
    // Update tracking change for microservice
    await MicroserviceExtraHostManager.updateOriginMicroserviceChangeTracking(extraHost, transaction)
  }
}

async function _updateProxyRouters (fogId, router, transaction) {
  const proxyCatalog = await CatalogService.getProxyCatalogItem(transaction)
  const proxyMicroservices = await MicroserviceManager.findAll({ catalogItemId: proxyCatalog.id, iofogUuid: fogId }, transaction)
  for (const proxyMicroservice of proxyMicroservices) {
    const config = JSON.parse(proxyMicroservice.config || '{}')
    config.networkRouter = {
      host: router.host,
      port: router.messagingPort
    }
    await MicroserviceManager.updateIfChanged({ uuid: proxyMicroservice.uuid }, { config: JSON.stringify(config) }, transaction)
    await ChangeTrackingService.update(fogId, ChangeTrackingService.events.microserviceConfig, transaction)
  }
}

async function _deleteFogRouter (fogData, transaction) {
  const router = await RouterManager.findOne({ iofogUuid: fogData.uuid }, transaction)
  const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)

  // If agent had a router, delete router and update linked routers
  if (!router) {
    // Router mode is none, there is nothing to do
    return
  }

  const routerId = router.id
  const routerConnections = await RouterConnectionManager.findAllWithRouters({ [Op.or]: [{ destRouter: routerId }, { sourceRouter: routerId }] }, transaction)
  // Delete all router connections, and set routerChanged flag for linked routers
  if (routerConnections) {
    for (const connection of routerConnections) {
      const router = connection.source.id === routerId ? connection.dest : connection.source
      // Delete router connection
      await RouterConnectionManager.delete({ id: connection.id }, transaction)
      // Update config for downstream routers
      if (connection.dest.id === routerId) {
        // in order to keep downstream routers in the network, we connect them to default router
        if (defaultRouter) {
          await RouterConnectionManager.create({ sourceRouter: router.id, destRouter: defaultRouter.id }, transaction)
        }

        // Update router config
        await RouterService.updateConfig(router.id, fogData.containerEngine, transaction)
        // Set routerChanged flag
        await ChangeTrackingService.update(router.iofogUuid, ChangeTrackingService.events.routerChanged, transaction)
      }
    }
  }

  // Connect the agents to default router
  if (defaultRouter) {
    const connectedAgents = await FogManager.findAll({ routerId }, transaction)
    for (const connectedAgent of connectedAgents) {
      await FogManager.update({ uuid: connectedAgent.uuid }, { routerId: defaultRouter.id }, transaction)
      await _updateProxyRouters(connectedAgent.uuid, defaultRouter, transaction)
      await ChangeTrackingService.update(connectedAgent.uuid, ChangeTrackingService.events.routerChanged, transaction)
    }
  }
  // Delete router
  await RouterManager.delete({ iofogUuid: fogData.uuid }, transaction)
  // Delete router msvc
  const routerCatalog = await CatalogService.getRouterCatalogItem(transaction)
  await MicroserviceManager.delete({ catalogItemId: routerCatalog.id, iofogUuid: fogData.uuid }, transaction)
  // await ApplicationManager.delete({ name: `system-${fogData.uuid.toLowerCase()}` }, transaction)
}

async function deleteFogEndPoint (fogData, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogDelete)

  const queryFogData = { uuid: fogData.uuid }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  await _deleteFogRouter(fogData, transaction)

  await _processDeleteCommand(fog, transaction)
}

function _getRouterUuid (router, defaultRouter) {
  return (defaultRouter && (router.id === defaultRouter.id)) ? Constants.DEFAULT_ROUTER_NAME : router.iofogUuid
}

function _getNatsUuid (nats, defaultHub) {
  return (defaultHub && (nats.id === defaultHub.id)) ? Constants.DEFAULT_NATS_HUB_NAME : nats.iofogUuid
}

async function _getFogRouterConfig (fog, transaction) {
  // Get fog router config
  const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  const router = await fog.getRouter()
  const routerConfig = {

  }
  // Router mode is either interior or edge
  if (router) {
    routerConfig.routerMode = router.isEdge ? 'edge' : 'interior'
    routerConfig.messagingPort = router.messagingPort
    if (routerConfig.routerMode === 'interior') {
      routerConfig.interRouterPort = router.interRouterPort
      routerConfig.edgeRouterPort = router.edgeRouterPort
    }
    // Get upstream routers
    const upstreamRoutersConnections = await RouterConnectionManager.findAllWithRouters({ sourceRouter: router.id }, transaction)
    routerConfig.upstreamRouters = upstreamRoutersConnections ? upstreamRoutersConnections.map(r => _getRouterUuid(r.dest, defaultRouter)) : []
  } else {
    routerConfig.routerMode = 'none'
    const networkRouter = await RouterManager.findOne({ id: fog.routerId }, transaction)
    if (networkRouter) {
      routerConfig.networkRouter = _getRouterUuid(networkRouter, defaultRouter)
    }
  }

  return routerConfig
}

async function _getFogNatsConfig (fog, transaction) {
  const defaultHub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  const nats = await fog.getNats()
  const natsConfig = {}

  if (nats) {
    natsConfig.natsMode = nats.isLeaf ? 'leaf' : 'server'
    natsConfig.natsServerPort = nats.serverPort
    natsConfig.natsLeafPort = nats.leafPort
    natsConfig.natsClusterPort = nats.clusterPort
    natsConfig.natsMqttPort = nats.mqttPort
    natsConfig.natsHttpPort = nats.httpPort
    natsConfig.jsStorageSize = nats.jsStorageSize
    natsConfig.jsMemoryStoreSize = nats.jsMemoryStoreSize

    const upstreamNatsConnections = await NatsConnectionManager.findAllWithNats({ sourceNats: nats.id }, transaction)
    natsConfig.upstreamNatsServers = upstreamNatsConnections
      ? upstreamNatsConnections.map((connection) => _getNatsUuid(connection.dest, defaultHub))
      : []
  } else {
    natsConfig.natsMode = 'none'
    natsConfig.upstreamNatsServers = []
  }

  return natsConfig
}

async function _getFogEdgeResources (fog, transaction) {
  const resourceAttributes = [
    'name',
    'version',
    'description',
    'interfaceProtocol',
    'displayName',
    'displayIcon',
    'displayColor'
  ]
  const resources = await fog.getEdgeResources({ attributes: resourceAttributes })
  return resources.map(EdgeResourceService.buildGetObject)
}

async function _getFogVolumeMounts (fog, transaction) {
  const volumeMountAttributes = [
    'name',
    'version',
    'configMapName',
    'secretName'
  ]
  const volumeMounts = await fog.getVolumeMounts({ attributes: volumeMountAttributes })
  return volumeMounts.map(vm => {
    return {
      name: vm.name,
      version: vm.version,
      configMapName: vm.configMapName,
      secretName: vm.secretName
    }
  })
}

async function _getFogExtraInformation (fog, transaction) {
  const routerConfig = await _getFogRouterConfig(fog, transaction)
  const natsConfig = await _getFogNatsConfig(fog, transaction)
  const edgeResources = await _getFogEdgeResources(fog, transaction)
  const volumeMounts = await _getFogVolumeMounts(fog, transaction)
  // Transform to plain JS object
  if (fog.toJSON && typeof fog.toJSON === 'function') {
    fog = fog.toJSON()
  }
  return { ...fog, tags: _mapTags(fog), ...routerConfig, ...natsConfig, edgeResources, volumeMounts }
}

// Map tags to string array
// Return plain JS object
function _mapTags (fog) {
  return fog.tags ? fog.tags.map(t => t.value) : []
}

/**
 * Extracts service-related tags from fog node tags
 * @param {Array<string>} fogTags - Array of tags from fog node
 * @returns {Array<string>} Array of service tags (e.g., ["all", "foo", "bar"])
 */
async function _extractServiceTags (fogTags) {
  if (!fogTags || !Array.isArray(fogTags)) {
    return []
  }

  // Filter tags that start with SERVICE_ANNOTATION_TAG
  const serviceTags = fogTags
    .filter(tag => tag.startsWith(SERVICE_ANNOTATION_TAG))
    .map(tag => {
      // Extract the value after the colon
      const parts = tag.split(':')
      return parts.length > 1 ? parts[1].trim() : ''
    })
    .filter(tag => tag !== '') // Remove empty tags

  // If we have "all" tag, return just that
  if (serviceTags.includes('all')) {
    return ['all']
  }

  return serviceTags
}

async function getFog (fogData, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGet)

  const queryFogData = fogData.uuid ? { uuid: fogData.uuid } : { name: fogData.name }

  const fog = await FogManager.findOneWithTags(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  return _getFogExtraInformation(fog, transaction)
}

async function getFogEndPoint (fogData, isCLI, transaction) {
  return getFog(fogData, isCLI, transaction)
}

// async function getFogListEndPoint (filters, isCLI, isSystem, transaction) {
async function getFogListEndPoint (filters, isCLI, transaction) {
  await Validator.validate(filters, Validator.schemas.iofogFilters)

  // // If listing system agent through REST API, make sure user is authenticated
  // if (isSystem && !isCLI && !lget('id')) {
  //   throw new Errors.AuthenticationError('Unauthorized')
  // }

  // const queryFogData = isSystem ? { isSystem } : (isCLI ? {} : { isSystem: false })
  const queryFogData = {}

  let fogs = await FogManager.findAllWithTags(queryFogData, transaction)
  fogs = _filterFogs(fogs, filters)

  // Map all tags
  // Get router config info for all fogs
  fogs = await Promise.all(fogs.map(async (fog) => _getFogExtraInformation(fog, transaction)))
  return {
    fogs
  }
}

async function generateProvisioningKeyEndPoint (fogData, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGenerateProvision)

  const queryFogData = { uuid: fogData.uuid }

  const newProvision = {
    iofogUuid: fogData.uuid,
    provisionKey: AppHelper.generateUUID(),
    expirationTime: new Date().getTime() + (20 * 60 * 1000)
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  const provisioningKeyData = await FogProvisionKeyManager.updateOrCreate({ iofogUuid: fogData.uuid }, newProvision, transaction)

  const devMode = process.env.DEV_MODE || config.get('server.devMode')
  const sslCert = process.env.SSL_CERT || config.get('server.ssl.path.cert')
  const intermedKey = process.env.INTERMEDIATE_CERT || config.get('server.ssl.path.intermediateCert')
  const sslCertBase64 = config.get('server.ssl.base64.cert')
  const intermedKeyBase64 = config.get('server.ssl.base64.intermediateCert')
  const hasFileBasedSSL = !devMode && sslCert
  const hasBase64SSL = !devMode && sslCertBase64
  let caCert = ''

  if (!devMode) {
    if (hasFileBasedSSL) {
      try {
        if (intermedKey) {
          // Check if intermediate certificate file exists before trying to read it
          if (fs.existsSync(intermedKey)) {
            const certData = fs.readFileSync(intermedKey)
            caCert = Buffer.from(certData).toString('base64')
          } else {
            // Intermediate certificate file doesn't exist, don't provide any CA cert
            // Let the system's default trust store handle validation
            logger.info(`Intermediate certificate file not found at path: ${intermedKey}, not providing CA certificate`)
            caCert = ''
          }
        } else {
          // No intermediate certificate path provided, don't provide any CA cert
          // Let the system's default trust store handle validation
          caCert = ''
        }
      } catch (error) {
        throw new Errors.ValidationError('Failed to read SSL certificate file')
      }
    }
    if (hasBase64SSL) {
      if (intermedKeyBase64) {
        caCert = intermedKeyBase64
      } else {
        // No intermediate certificate base64 provided, don't provide any CA cert
        // Let the system's default trust store handle validation
        caCert = ''
      }
    }
  }
  return {
    key: provisioningKeyData.provisionKey,
    expirationTime: provisioningKeyData.expirationTime,
    caCert: caCert
  }
}

async function setFogVersionCommandEndPoint (fogVersionData, isCLI, transaction) {
  await Validator.validate(fogVersionData, Validator.schemas.iofogSetVersionCommand)

  const queryFogData = { uuid: fogVersionData.uuid }

  const newVersionCommand = {
    iofogUuid: fogVersionData.uuid,
    versionCommand: fogVersionData.versionCommand
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, queryFogData.uuid))
  }

  if (!fog.isReadyToRollback && fogVersionData.versionCommand === 'rollback') {
    throw new Errors.ValidationError(ErrorMessages.INVALID_VERSION_COMMAND_ROLLBACK)
  }
  if (!fog.isReadyToUpgrade && fogVersionData.versionCommand === 'upgrade') {
    throw new Errors.ValidationError(ErrorMessages.INVALID_VERSION_COMMAND_UPGRADE)
  }

  await generateProvisioningKeyEndPoint({ uuid: fogVersionData.uuid }, isCLI, transaction)
  await FogVersionCommandManager.updateOrCreate({ iofogUuid: fogVersionData.uuid }, newVersionCommand, transaction)
  await ChangeTrackingService.update(fogVersionData.uuid, ChangeTrackingService.events.version, transaction)
}

async function setFogRebootCommandEndPoint (fogData, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogReboot)

  const queryFogData = { uuid: fogData.uuid }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.reboot, transaction)
}

async function getHalHardwareInfoEndPoint (uuidObj, isCLI, transaction) {
  await Validator.validate(uuidObj, Validator.schemas.halGet)

  const fog = await FogManager.findOne({
    uuid: uuidObj.uuid
  }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, uuidObj.uuid))
  }

  return HWInfoManager.findOne({
    iofogUuid: uuidObj.uuid
  }, transaction)
}

async function getHalUsbInfoEndPoint (uuidObj, isCLI, transaction) {
  await Validator.validate(uuidObj, Validator.schemas.halGet)

  const fog = await FogManager.findOne({
    uuid: uuidObj.uuid
  }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, uuidObj.uuid))
  }

  return USBInfoManager.findOne({
    iofogUuid: uuidObj.uuid
  }, transaction)
}

function _filterFogs (fogs, filters) {
  if (!filters) {
    return fogs
  }

  const filtered = []
  fogs.forEach((fog) => {
    let isMatchFog = true
    filters.some((filter) => {
      const fld = filter.key
      const val = filter.value
      const condition = filter.condition
      const isMatchField = (condition === 'equals' && fog[fld] && fog[fld] === val) ||
        (condition === 'has' && fog[fld] && fog[fld].includes(val))
      if (!isMatchField) {
        isMatchFog = false
        return false
      }
    })
    if (isMatchFog) {
      filtered.push(fog)
    }
  })
  return filtered
}

async function _processDeleteCommand (fog, transaction) {
  const microservices = await MicroserviceManager.findAll({ iofogUuid: fog.uuid }, transaction)
  for (const microservice of microservices) {
    await MicroserviceService.deleteMicroserviceWithRoutesAndPortMappings(microservice, transaction)
  }
  const systemAppName = getSystemAppName(fog.name)
  const legacySystemAppName = getLegacySystemAppName(fog.uuid)
  await ApplicationManager.delete({ name: systemAppName }, transaction)
  if (legacySystemAppName !== systemAppName) {
    await ApplicationManager.delete({ name: legacySystemAppName }, transaction)
  }
  await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.deleteNode, transaction)
  // Delete router-related secrets if they exist
  const secretNames = [
    `router-site-server-${fog.name}`,
    `router-local-ca-${fog.name}`,
    `router-local-server-${fog.name}`,
    `router-local-agent-${fog.name}`
  ]

  for (const secretName of secretNames) {
    const secret = await SecretManager.findOne({ name: secretName }, transaction)
    if (secret) {
      // Remove secret from external vault if configured
      if (vaultManager.isEnabled()) {
        await SecretHelper.deleteSecret(secretName, secret.type)
      }
      await SecretManager.delete({ name: secretName }, transaction)
    }
  }
  await NatsService.cleanupNatsForFog(fog, transaction)
  const fogPublicKey = await FogPublicKeyManager.findByFogUuid(fog.uuid, transaction)
  if (fogPublicKey) {
    await FogKeyService.deletePublicKey(fog.uuid, transaction)
  }
  await FogManager.delete({ uuid: fog.uuid }, transaction)
}

async function _createHalMicroserviceForFog (fogData, oldFog, transaction) {
  const halItem = await CatalogService.getHalCatalogItem(transaction)
  const systemMicroserviceName = getSystemMicroserviceName('hal')
  const fogForName = (fogData && fogData.name) ? fogData : oldFog

  const halMicroserviceData = {
    uuid: AppHelper.generateUUID(),
    name: systemMicroserviceName,
    config: '{}',
    catalogItemId: halItem.id,
    iofogUuid: fogData.uuid,
    hostNetworkMode: true,
    isPrivileged: true,
    logSize: Constants.MICROSERVICE_DEFAULT_LOG_SIZE,
    schedule: 1,
    configLastUpdated: Date.now()
  }

  const application = await ensureSystemApplication(fogForName, transaction)
  halMicroserviceData.applicationId = application.id
  const existingMicroservice = await MicroserviceManager.findOne({
    name: systemMicroserviceName,
    applicationId: application.id
  }, transaction)
  if (!existingMicroservice) {
    await MicroserviceManager.create(halMicroserviceData, transaction)
    await MicroserviceStatusManager.create({ microserviceUuid: halMicroserviceData.uuid }, transaction)
    await MicroserviceExecStatusManager.create({ microserviceUuid: halMicroserviceData.uuid }, transaction)
  }
}

async function _deleteHalMicroserviceByFog (fogData, transaction) {
  const halItem = await CatalogService.getHalCatalogItem(transaction)
  const deleteHalMicroserviceData = {
    iofogUuid: fogData.uuid,
    catalogItemId: halItem.id
  }

  const fog = await FogManager.findOne({ uuid: fogData.uuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }
  const systemAppName = getSystemAppName(fog.name)
  const legacySystemAppName = getLegacySystemAppName(fog.uuid)
  let application = await ApplicationManager.findOne({ name: systemAppName }, transaction)
  if (!application) {
    application = await ApplicationManager.findOne({ name: legacySystemAppName }, transaction)
  }
  if (application) {
    deleteHalMicroserviceData.applicationId = application.id
    await MicroserviceManager.delete(deleteHalMicroserviceData, transaction)
  }
}

async function _deleteNatsMicroserviceByFog (fogData, transaction) {
  const natsItem = await CatalogService.getNatsCatalogItem(transaction)
  if (!natsItem) return
  const deleteNatsMicroserviceData = {
    iofogUuid: fogData.uuid,
    catalogItemId: natsItem.id
  }

  const fog = await FogManager.findOne({ uuid: fogData.uuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }
  const systemAppName = getSystemAppName(fog.name)
  const legacySystemAppName = getLegacySystemAppName(fog.uuid)
  let application = await ApplicationManager.findOne({ name: systemAppName }, transaction)
  if (!application) {
    application = await ApplicationManager.findOne({ name: legacySystemAppName }, transaction)
  }
  if (application) {
    deleteNatsMicroserviceData.applicationId = application.id
    await MicroserviceManager.delete(deleteNatsMicroserviceData, transaction)
  }
}

async function _createBluetoothMicroserviceForFog (fogData, oldFog, transaction) {
  const bluetoothItem = await CatalogService.getBluetoothCatalogItem(transaction)
  const systemMicroserviceName = getSystemMicroserviceName('ble')
  const fogForName = (fogData && fogData.name) ? fogData : oldFog

  const bluetoothMicroserviceData = {
    uuid: AppHelper.generateUUID(),
    name: systemMicroserviceName,
    config: '{}',
    catalogItemId: bluetoothItem.id,
    iofogUuid: fogData.uuid,
    hostNetworkMode: true,
    isPrivileged: true,
    logSize: Constants.MICROSERVICE_DEFAULT_LOG_SIZE,
    schedule: 1,
    configLastUpdated: Date.now()
  }

  const application = await ensureSystemApplication(fogForName, transaction)
  bluetoothMicroserviceData.applicationId = application.id
  const existingMicroservice = await MicroserviceManager.findOne({
    name: systemMicroserviceName,
    applicationId: application.id
  }, transaction)
  if (!existingMicroservice) {
    await MicroserviceManager.create(bluetoothMicroserviceData, transaction)
    await MicroserviceStatusManager.create({ microserviceUuid: bluetoothMicroserviceData.uuid }, transaction)
    await MicroserviceExecStatusManager.create({ microserviceUuid: bluetoothMicroserviceData.uuid }, transaction)
  }
}

async function _deleteBluetoothMicroserviceByFog (fogData, transaction) {
  const bluetoothItem = await CatalogService.getBluetoothCatalogItem(transaction)
  const deleteBluetoothMicroserviceData = {
    iofogUuid: fogData.uuid,
    catalogItemId: bluetoothItem.id
  }
  const fog = await FogManager.findOne({ uuid: fogData.uuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }
  const systemAppName = getSystemAppName(fog.name)
  const legacySystemAppName = getLegacySystemAppName(fog.uuid)
  let application = await ApplicationManager.findOne({ name: systemAppName }, transaction)
  if (!application) {
    application = await ApplicationManager.findOne({ name: legacySystemAppName }, transaction)
  }
  if (application) {
    deleteBluetoothMicroserviceData.applicationId = application.id
    await MicroserviceManager.delete(deleteBluetoothMicroserviceData, transaction)
  }
}

async function setFogPruneCommandEndPoint (fogData, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogPrune)

  const queryFogData = { uuid: fogData.uuid }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.prune, transaction)
}

async function enableNodeExecEndPoint (execData, isCLI, transaction) {
  await Validator.validate(execData, Validator.schemas.enableNodeExec)
  const fog = await FogManager.findOne({ uuid: execData.uuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, execData.uuid))
  }
  const systemMicroserviceName = getSystemMicroserviceName('debug')

  const debugMicroserviceData = {
    uuid: AppHelper.generateUUID(),
    name: systemMicroserviceName,
    config: '{}',
    iofogUuid: execData.uuid,
    ipcMode: 'host',
    pidMode: 'host',
    hostNetworkMode: true,
    isPrivileged: true,
    logSize: Constants.MICROSERVICE_DEFAULT_LOG_SIZE,
    schedule: 0,
    execEnabled: true,
    configLastUpdated: Date.now()
  }

  if (execData.image) {
    const images = [
      { fogTypeId: 1, containerImage: execData.image },
      { fogTypeId: 2, containerImage: execData.image }
    ]
    debugMicroserviceData.images = images
  } else {
    const debugCatalog = await CatalogService.getDebugCatalogItem(transaction)
    debugMicroserviceData.catalogItemId = debugCatalog.id
  }

  const application = await ensureSystemApplication(fog, transaction)
  debugMicroserviceData.applicationId = application.id
  let microservice

  // Check if microservice already exists
  const existingMicroservice = await MicroserviceManager.findOneWithCategory({
    name: systemMicroserviceName,
    applicationId: application.id
  }, transaction)

  if (existingMicroservice) {
    // Update existing microservice
    const updateData = {
      ipcMode: debugMicroserviceData.ipcMode,
      pidMode: debugMicroserviceData.pidMode,
      hostNetworkMode: debugMicroserviceData.hostNetworkMode,
      isPrivileged: debugMicroserviceData.isPrivileged,
      logSize: debugMicroserviceData.logSize,
      schedule: debugMicroserviceData.schedule,
      configLastUpdated: debugMicroserviceData.configLastUpdated,
      execEnabled: debugMicroserviceData.execEnabled
    }

    if (execData.image) {
      updateData.images = debugMicroserviceData.images
    } else {
      updateData.catalogItemId = debugMicroserviceData.images
    }

    microservice = await MicroserviceManager.updateAndFind(
      { uuid: existingMicroservice.uuid },
      updateData,
      transaction
    )

    if (execData.image) {
      const images = [
        { fogTypeId: 1, containerImage: execData.image },
        { fogTypeId: 2, containerImage: execData.image }
      ]
      await _updateImages(images, existingMicroservice.uuid, transaction)
    }

    await ChangeTrackingService.update(execData.uuid, ChangeTrackingService.events.microserviceList, transaction)
    await ChangeTrackingService.update(execData.uuid, ChangeTrackingService.events.microserviceExecSessions, transaction)
    return microservice
  } else {
    // Create new microservice
    try {
      const microservice = await MicroserviceManager.create(debugMicroserviceData, transaction)
      await MicroserviceStatusManager.create({ microserviceUuid: debugMicroserviceData.uuid }, transaction)
      await MicroserviceExecStatusManager.create({ microserviceUuid: debugMicroserviceData.uuid }, transaction)

      if (execData.image) {
        const images = [
          { fogTypeId: 1, containerImage: execData.image },
          { fogTypeId: 2, containerImage: execData.image }
        ]
        await _createMicroserviceImages(microservice, images, transaction)
      }

      await ChangeTrackingService.update(execData.uuid, ChangeTrackingService.events.microserviceList, transaction)
      await ChangeTrackingService.update(execData.uuid, ChangeTrackingService.events.microserviceExecSessions, transaction)

      return microservice
    } catch (error) {
      logger.error(`Error in enableNodeExecEndPoint: ${error.message}`)
      throw error
    }
  }
}

async function disableNodeExecEndPoint (fogData, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.disableNodeExec)

  try {
    const fog = await FogManager.findOne({ uuid: fogData.uuid }, transaction)
    if (!fog) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
    }

    const application = await ensureSystemApplication(fog, transaction)
    const microservice = await MicroserviceManager.findOne({
      name: getSystemMicroserviceName('debug'),
      applicationId: application.id
    }, transaction)
    if (!microservice) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, fogData.uuid))
    }

    await MicroserviceManager.delete({ uuid: microservice.uuid }, transaction)
    await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.microserviceList, transaction)
    await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.microserviceExecSessions, transaction)
  } catch (error) {
    logger.error(`Error in disableNodeExecEndPoint: ${error.message}`)
    throw error
  }
}

/**
 * Finds services that match the fog node's service tags
 * @param {Array<string>} serviceTags - Array of service tags from fog node
 * @param {Object} transaction - Database transaction
 * @returns {Promise<Array<Object>>} Array of matching services
 */
async function _findMatchingServices (serviceTags, transaction) {
  if (!serviceTags || serviceTags.length === 0) {
    return []
  }

  // If 'all' tag is present, get all services
  if (serviceTags.includes('all')) {
    return ServiceManager.findAllWithTags({}, transaction)
  }

  // For each service tag, find matching services
  const servicesPromises = serviceTags.map(async (tag) => {
    const queryData = {
      '$tags.value$': `${tag}`
    }
    return ServiceManager.findAllWithTags(queryData, transaction)
  })

  // Wait for all queries to complete
  const servicesArrays = await Promise.all(servicesPromises)

  // Flatten arrays and remove duplicates based on service name
  const seen = new Set()
  const uniqueServices = servicesArrays
    .flat()
    .filter(service => {
      if (seen.has(service.name)) {
        return false
      }
      seen.add(service.name)
      return true
    })

  return uniqueServices
}

/**
 * Builds TCP listener configuration for a service on a specific fog node
 * @param {Object} service - Service object containing name and bridgePort
 * @param {string} fogNodeUuid - UUID of the fog node
 * @returns {Object} TCP listener configuration
 */
function _buildTcpListenerForFog (service, fogNodeUuid) {
  return {
    name: `${service.name}-listener`,
    port: service.bridgePort.toString(),
    address: service.name,
    siteId: fogNodeUuid
  }
}

/**
 * Gets the router microservice configuration for a fog node
 * @param {string} fogNodeUuid - UUID of the fog node
 * @param {Object} transaction - Database transaction
 * @returns {Promise<Object>} Router microservice configuration
 */
async function _getRouterMicroserviceConfig (fogNodeUuid, transaction) {
  const fog = await FogManager.findOne({ uuid: fogNodeUuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogNodeUuid))
  }
  const application = await ensureSystemApplication(fog, transaction)
  const routerName = getSystemMicroserviceName('router')
  const routerMicroservice = await MicroserviceManager.findOne({
    name: routerName,
    applicationId: application.id
  }, transaction)
  if (!routerMicroservice) {
    throw new Errors.NotFoundError(`Router microservice not found: ${routerName}`)
  }
  const routerConfig = JSON.parse(routerMicroservice.config || '{}')
  return routerConfig
}

/**
 * Extracts existing TCP connectors from router configuration
 * @param {string} fogNodeUuid - UUID of the fog node
 * @param {Object} transaction - Database transaction
 * @returns {Promise<Object>} Object containing TCP connectors
 */
async function _extractExistingTcpConnectors (fogNodeUuid, transaction) {
  const routerConfig = await _getRouterMicroserviceConfig(fogNodeUuid, transaction)
  // Return empty object if no bridges or tcpConnectors exist
  if (!routerConfig.bridges || !routerConfig.bridges.tcpConnectors) {
    return {}
  }

  return routerConfig.bridges.tcpConnectors
}

/**
 * Merges a single TCP connector into router configuration
 * @param {Object} routerConfig - Base router configuration
 * @param {Object} connectorObj - TCP connector object (must have 'name' property)
 * @returns {Object} Updated router configuration
 */
function _mergeTcpConnector (routerConfig, connectorObj) {
  if (!connectorObj || !connectorObj.name) {
    throw new Error('Connector object must have a name property')
  }
  if (!routerConfig.bridges) {
    routerConfig.bridges = {}
  }
  if (!routerConfig.bridges.tcpConnectors) {
    routerConfig.bridges.tcpConnectors = {}
  }
  routerConfig.bridges.tcpConnectors[connectorObj.name] = connectorObj
  return routerConfig
}

/**
 * Merges a single TCP listener into router configuration
 * @param {Object} routerConfig - Base router configuration
 * @param {Object} listenerObj - TCP listener object (must have 'name' property)
 * @returns {Object} Updated router configuration
 */
function _mergeTcpListener (routerConfig, listenerObj) {
  if (!listenerObj || !listenerObj.name) {
    throw new Error('Listener object must have a name property')
  }
  if (!routerConfig.bridges) {
    routerConfig.bridges = {}
  }
  if (!routerConfig.bridges.tcpListeners) {
    routerConfig.bridges.tcpListeners = {}
  }
  routerConfig.bridges.tcpListeners[listenerObj.name] = listenerObj
  return routerConfig
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

async function _updateImages (images, microserviceUuid, transaction) {
  await CatalogItemImageManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  return _createMicroserviceImages({ uuid: microserviceUuid }, images, transaction)
}

const bypassOptions = { bypassQueue: true }

module.exports = {
  createFogEndPoint: TransactionDecorator.generateTransaction(createFogEndPoint, bypassOptions),
  updateFogEndPoint: TransactionDecorator.generateTransaction(updateFogEndPoint, bypassOptions),
  deleteFogEndPoint: TransactionDecorator.generateTransaction(deleteFogEndPoint, bypassOptions),
  getFogEndPoint: TransactionDecorator.generateTransaction(getFogEndPoint),
  getFogListEndPoint: TransactionDecorator.generateTransaction(getFogListEndPoint),
  generateProvisioningKeyEndPoint: TransactionDecorator.generateTransaction(generateProvisioningKeyEndPoint),
  setFogVersionCommandEndPoint: TransactionDecorator.generateTransaction(setFogVersionCommandEndPoint),
  setFogRebootCommandEndPoint: TransactionDecorator.generateTransaction(setFogRebootCommandEndPoint),
  getHalHardwareInfoEndPoint: TransactionDecorator.generateTransaction(getHalHardwareInfoEndPoint),
  getHalUsbInfoEndPoint: TransactionDecorator.generateTransaction(getHalUsbInfoEndPoint),
  getFog: getFog,
  setFogPruneCommandEndPoint: TransactionDecorator.generateTransaction(setFogPruneCommandEndPoint),
  enableNodeExecEndPoint: TransactionDecorator.generateTransaction(enableNodeExecEndPoint),
  disableNodeExecEndPoint: TransactionDecorator.generateTransaction(disableNodeExecEndPoint),
  _extractServiceTags,
  _findMatchingServices: TransactionDecorator.generateTransaction(_findMatchingServices),
  _buildTcpListenerForFog,
  _getRouterMicroserviceConfig: TransactionDecorator.generateTransaction(_getRouterMicroserviceConfig),
  _extractExistingTcpConnectors: TransactionDecorator.generateTransaction(_extractExistingTcpConnectors),
  _mergeTcpConnector,
  _mergeTcpListener,
  checkKubernetesEnvironment,
  _handleRouterCertificates: TransactionDecorator.generateTransaction(_handleRouterCertificates)
}
