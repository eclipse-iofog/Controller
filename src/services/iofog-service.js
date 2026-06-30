const config = require('../config')
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
  getSystemMicroserviceName,
  slugifyName
} = require('../helpers/system-naming')
const Constants = require('../helpers/constants')
const {
  routerLocalCertificateHosts,
  buildNatsServerCertificateHostList,
  buildNatsMqttCertificateHostList
} = require('../helpers/cert-dns-sans')
const Op = require('sequelize').Op
const CertificateService = require('./certificate-service')
const logger = require('../logger')
const ServiceManager = require('../data/managers/service-manager')
const SecretManager = require('../data/managers/secret-manager')
const vaultManager = require('../vault/vault-manager')
const SecretHelper = require('../helpers/secret-helper')
const FogPublicKeyManager = require('../data/managers/iofog-public-key-manager')
const { getServiceAnnotationTag } = require('../config/flavor')
const FogPlatformSpecManager = require('../data/managers/fog-platform-spec-manager')
const FogPlatformStatusManager = require('../data/managers/fog-platform-status-manager')
const ReconcileOutboxManager = require('../data/managers/reconcile-outbox-manager')
const {
  buildPlatformSpecFromFogData,
  mergePlatformSpecPatch
} = require('../schemas/fog-platform-spec')

const SITE_CA_CERT = Constants.ROUTER_SITE_CA
const DEFAULT_ROUTER_LOCAL_CA = Constants.DEFAULT_ROUTER_LOCAL_CA
const NATS_SITE_CA = Constants.NATS_SITE_CA
const DEFAULT_NATS_LOCAL_CA = Constants.DEFAULT_NATS_LOCAL_CA

const _fogToken = (fog) => slugifyName((fog && fog.name) || (fog && fog.uuid) || 'fog')

function _resolveArchId (fogData) {
  if (fogData.archId !== undefined) return fogData.archId
  return undefined
}

async function checkKubernetesEnvironment () {
  const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')
  return controlPlane && controlPlane.toLowerCase() === 'kubernetes'
}

async function _deriveRuntimePlatformModes (fog, transaction) {
  const router = await fog.getRouter()
  const nats = await fog.getNats()
  return {
    routerMode: router ? (router.isEdge ? 'edge' : 'interior') : undefined,
    natsMode: nats ? (nats.isLeaf ? 'leaf' : 'server') : undefined
  }
}

function _resolveEffectivePlatformModes (fogData, runtimeModes, parsedSpec) {
  const spec = parsedSpec && parsedSpec.spec ? parsedSpec.spec : {}
  return {
    routerMode: fogData.routerMode ?? runtimeModes.routerMode ?? spec.routerMode ?? 'none',
    natsMode: fogData.natsMode ?? runtimeModes.natsMode ?? spec.natsMode ?? 'none'
  }
}

async function getLocalCertificateHosts (fogData, uuid, transaction) {
  const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  const isDefaultRouter = !!(defaultRouter && defaultRouter.iofogUuid === uuid)
  return routerLocalCertificateHosts(fogData, { isDefaultRouter })
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

async function _recreateCertificateIfExists (name, subject, hosts, ca, transaction) {
  try {
    const existingCert = await CertificateService.getCertificateEndpoint(name, transaction)
    if (!existingCert) {
      return
    }
    await CertificateService.deleteCertificateEndpoint(name, transaction)
    await CertificateService.createCertificateEndpoint({
      name,
      subject: `${subject}`,
      hosts,
      ca
    }, transaction)
  } catch (err) {
    if (err.name === 'NotFoundError') {
      return
    }
    throw err
  }
}

async function _reconcileNatsCertificatesOnHostChange (fog, transaction) {
  const fogToken = _fogToken(fog)
  const serverCertName = `nats-server-${fogToken}`
  const mqttCertName = `nats-mqtt-server-${fogToken}`
  const serverHosts = buildNatsServerCertificateHostList(fog).join(',')
  const mqttHosts = buildNatsMqttCertificateHostList(fog).join(',')

  await _recreateCertificateIfExists(
    serverCertName,
    serverCertName,
    serverHosts,
    { type: 'direct', secretName: NATS_SITE_CA },
    transaction
  )
  await _recreateCertificateIfExists(
    mqttCertName,
    mqttCertName,
    mqttHosts,
    { type: 'direct', secretName: DEFAULT_NATS_LOCAL_CA },
    transaction
  )
}

async function _handleRouterCertificates (fogData, uuid, shouldRecreateCerts, transaction) {
  logger.debug('Starting _handleRouterCertificates for fog: ' + JSON.stringify({ uuid, host: fogData.host }))

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
      await ensureCA(DEFAULT_ROUTER_LOCAL_CA, DEFAULT_ROUTER_LOCAL_CA)
      logger.debug('Ensuring local-agent certificate signed by DEFAULT_ROUTER_LOCAL_CA')
      const localHosts = await getLocalCertificateHosts(fogData, uuid, transaction)

      await ensureCert(
        `router-local-agent-${fogData.name}`,
        `${uuid}`,
        localHosts,
        { type: 'direct', secretName: DEFAULT_ROUTER_LOCAL_CA },
        shouldRecreateCerts
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
      shouldRecreateCerts
    )

    logger.debug('Ensuring DEFAULT_ROUTER_LOCAL_CA exists')
    await ensureCA(DEFAULT_ROUTER_LOCAL_CA, DEFAULT_ROUTER_LOCAL_CA)

    // Always ensure local-server cert exists
    logger.debug('Ensuring local-server certificate exists')
    const localHosts = await getLocalCertificateHosts(fogData, uuid, transaction)
    await ensureCert(
      `router-local-server-${fogData.name}`,
      `${uuid}`,
      localHosts,
      { type: 'direct', secretName: DEFAULT_ROUTER_LOCAL_CA },
      shouldRecreateCerts
    )

    // Always ensure local-agent cert exists
    logger.debug('Ensuring local-agent certificate exists')
    await ensureCert(
      `router-local-agent-${fogData.name}`,
      `${uuid}`,
      localHosts,
      { type: 'direct', secretName: DEFAULT_ROUTER_LOCAL_CA },
      shouldRecreateCerts
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

  if (!isKubernetes) {
    const existingFogs = await FogManager.findAll({}, transaction)
    if (existingFogs.length === 0) {
      fogData.isSystem = true
      fogData.routerMode = 'interior'
      fogData.natsMode = 'server'
      logger.info('First fog in cluster — promoting to system interior router with NATS server')
    }
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
    containerEngineUrl: fogData.containerEngineUrl,
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
    archId: _resolveArchId(fogData),
    logLevel: fogData.logLevel,
    edgeGuardFrequency: fogData.edgeGuardFrequency,
    pruningFrequency: fogData.pruningFrequency,
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

  const natsMode = fogData.natsMode || 'leaf'
  if (!isCLI && !fogData.host && (fogData.routerMode !== 'none' || natsMode !== 'none')) {
    throw new Errors.ValidationError(ErrorMessages.HOST_IS_REQUIRED)
  }

  // // TODO: handle multiple system fogs a.k.a multi-remote-controller and multi interior routers
  // if (fogData.isSystem && !!(await FogManager.findOne({ isSystem: true }, transaction))) {
  //   throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_SYSTEM_FOG))
  // }

  const existingFog = await FogManager.findOne({ name: createFogData.name }, transaction)
  if (existingFog) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, createFogData.name))
  }

  let defaultRouter
  if (fogData.routerMode === 'none') {
    const networkRouter = await RouterService.getNetworkRouter(fogData.networkRouter, transaction)
    if (!networkRouter) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, !fogData.networkRouter ? Constants.DEFAULT_ROUTER_NAME : fogData.networkRouter))
    }
    createFogData.routerId = networkRouter.id
  } else {
    defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
    await RouterService.validateAndReturnUpstreamRouters(
      fogData.upstreamRouters,
      fogData.isSystem,
      defaultRouter,
      transaction
    )
  }

  const fog = await FogManager.create(createFogData, transaction)

  // Set tags (synchronously, as this is a simple DB op)
  await _setTags(fog, fogData.tags, transaction)

  const platformSpec = buildPlatformSpecFromFogData(fogData, { applyCreateDefaults: true })
  const { generation } = await FogPlatformSpecManager.upsertSpec(fog.uuid, platformSpec, transaction)
  await FogPlatformStatusManager.ensurePending(fog.uuid, transaction)
  await ReconcileOutboxManager.enqueueFogPlatform({
    fogUuid: fog.uuid,
    reason: 'spec-changed',
    specGeneration: generation
  }, transaction)

  return { uuid: fog.uuid }
}

async function _setTags (fogModel, tagsArray, transaction) {
  if (tagsArray) {
    const tags = []
    for (const tag of tagsArray) {
      let tagModel = await TagsManager.findOne({ value: tag }, transaction)
      if (!tagModel) {
        tagModel = await TagsManager.create({ value: tag }, transaction)
      }
      tags.push(tagModel)
    }
    await fogModel.setTags(tags, { transaction })
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
    containerEngineUrl: fogData.containerEngineUrl,
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
    archId: _resolveArchId(fogData),
    logLevel: fogData.logLevel,
    pruningFrequency: fogData.pruningFrequency,
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

  const parsedSpec = await FogPlatformSpecManager.getParsedSpec(fogData.uuid, transaction)
  const runtimeModes = await _deriveRuntimePlatformModes(oldFog, transaction)
  const { routerMode: effectiveRouterMode, natsMode: effectiveNatsMode } = _resolveEffectivePlatformModes(
    fogData,
    runtimeModes,
    parsedSpec
  )

  const isSystem = updateFogData.isSystem === undefined ? oldFog.isSystem : updateFogData.isSystem
  if (isSystem && effectiveNatsMode !== 'server') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_NATS_MODE, effectiveNatsMode))
  }

  if (isSystem && effectiveRouterMode !== 'interior') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER_MODE, effectiveRouterMode))
  }

  if (updateFogData.isSystem !== undefined && updateFogData.isSystem !== oldFog.isSystem) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_SYSTEM_CHANGE))
  }

  // Prevent overwriting detected arch (1 or 2) with "auto" (0)
  // If arch is being set to "auto" (0) but the agent has already detected its type (1 or 2),
  // preserve the detected type to ensure getAgentMicroservices can find matching images
  const requestedArchId = _resolveArchId(fogData)
  if (requestedArchId === 0 && (oldFog.archId === 1 || oldFog.archId === 2)) {
    updateFogData.archId = undefined
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

  await FogManager.update(queryFogData, updateFogData, transaction)
  await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.config, transaction)

  const mergedSpec = mergePlatformSpecPatch(parsedSpec ? parsedSpec.spec : {}, fogData)
  const { generation } = await FogPlatformSpecManager.upsertSpec(fogData.uuid, mergedSpec, transaction)
  await FogPlatformStatusManager.ensurePending(fogData.uuid, transaction)
  await ReconcileOutboxManager.enqueueFogPlatform({
    fogUuid: fogData.uuid,
    reason: 'spec-changed',
    specGeneration: generation
  }, transaction)

  return { uuid: fogData.uuid }
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

  await FogPlatformStatusManager.setPhase(fogData.uuid, 'Deleting', {}, transaction)
  await ReconcileOutboxManager.enqueueFogPlatform({
    fogUuid: fogData.uuid,
    reason: 'delete'
  }, transaction)

  return { uuid: fogData.uuid }
}

async function reconcileFogEndpoint (fogData, transaction) {
  const fog = await FogManager.findOne({ uuid: fogData.uuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  const status = await FogPlatformStatusManager.getParsedStatus(fogData.uuid, transaction)
  if (status && status.phase === 'Failed') {
    await FogPlatformStatusManager.setPhase(fogData.uuid, 'Pending', { lastError: null }, transaction)
  }

  const parsedSpec = await FogPlatformSpecManager.getParsedSpec(fogData.uuid, transaction)
  await ReconcileOutboxManager.enqueueFogPlatform({
    fogUuid: fogData.uuid,
    reason: 'manual-retry',
    specGeneration: parsedSpec ? parsedSpec.generation : null
  }, transaction)

  return { uuid: fogData.uuid }
}

function _getRouterUuid (router, defaultRouter) {
  return (defaultRouter && (router.id === defaultRouter.id)) ? Constants.DEFAULT_ROUTER_NAME : router.iofogUuid
}

function _getNatsUuid (nats, defaultHub) {
  return (defaultHub && (nats.id === defaultHub.id)) ? Constants.DEFAULT_NATS_HUB_NAME : nats.iofogUuid
}

function _getSpecObject (parsedSpec) {
  return parsedSpec && parsedSpec.spec ? parsedSpec.spec : {}
}

function _formatPlatformStatus (status, generation) {
  if (!status) {
    return null
  }
  const formatted = {
    observedGeneration: status.observedGeneration,
    phase: status.phase,
    lastError: status.lastError,
    lastTransitionAt: status.lastTransitionAt,
    conditions: status.conditions
  }
  if (generation != null) {
    formatted.generation = generation
  }
  return formatted
}

async function _getFogRouterConfig (fog, parsedSpec, transaction) {
  const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  const router = await fog.getRouter()

  if (router) {
    const routerConfig = {
      routerMode: router.isEdge ? 'edge' : 'interior',
      messagingPort: router.messagingPort
    }
    if (routerConfig.routerMode === 'interior') {
      routerConfig.interRouterPort = router.interRouterPort
      routerConfig.edgeRouterPort = router.edgeRouterPort
    }
    const upstreamRoutersConnections = await RouterConnectionManager.findAllWithRouters({ sourceRouter: router.id }, transaction)
    routerConfig.upstreamRouters = upstreamRoutersConnections
      ? upstreamRoutersConnections.map(r => _getRouterUuid(r.dest, defaultRouter))
      : []
    return routerConfig
  }

  const spec = _getSpecObject(parsedSpec)
  const routerMode = spec.routerMode ?? 'none'
  if (routerMode === 'none') {
    const routerConfig = { routerMode: 'none' }
    if (spec.networkRouter) {
      routerConfig.networkRouter = spec.networkRouter
    } else if (fog.routerId) {
      const networkRouter = await RouterManager.findOne({ id: fog.routerId }, transaction)
      if (networkRouter) {
        routerConfig.networkRouter = _getRouterUuid(networkRouter, defaultRouter)
      }
    }
    return routerConfig
  }

  const routerConfig = {
    routerMode,
    messagingPort: spec.messagingPort,
    upstreamRouters: spec.upstreamRouters || []
  }
  if (routerMode === 'interior') {
    routerConfig.interRouterPort = spec.interRouterPort
    routerConfig.edgeRouterPort = spec.edgeRouterPort
  }
  return routerConfig
}

async function _getFogNatsConfig (fog, parsedSpec, transaction) {
  const defaultHub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  const nats = await fog.getNats()

  if (nats) {
    const natsConfig = {
      natsMode: nats.isLeaf ? 'leaf' : 'server',
      natsServerPort: nats.serverPort,
      natsLeafPort: nats.leafPort,
      natsClusterPort: nats.clusterPort,
      natsMqttPort: nats.mqttPort,
      natsHttpPort: nats.httpPort,
      jsStorageSize: nats.jsStorageSize,
      jsMemoryStoreSize: nats.jsMemoryStoreSize
    }
    const upstreamNatsConnections = await NatsConnectionManager.findAllWithNats({ sourceNats: nats.id }, transaction)
    natsConfig.upstreamNatsServers = upstreamNatsConnections
      ? upstreamNatsConnections.map((connection) => _getNatsUuid(connection.dest, defaultHub))
      : []
    return natsConfig
  }

  const spec = _getSpecObject(parsedSpec)
  const natsMode = spec.natsMode ?? 'none'
  if (natsMode === 'none') {
    return {
      natsMode: 'none',
      upstreamNatsServers: []
    }
  }

  return {
    natsMode,
    natsServerPort: spec.natsServerPort,
    natsLeafPort: spec.natsLeafPort,
    natsClusterPort: spec.natsClusterPort,
    natsMqttPort: spec.natsMqttPort,
    natsHttpPort: spec.natsHttpPort,
    jsStorageSize: spec.jsStorageSize,
    jsMemoryStoreSize: spec.jsMemoryStoreSize,
    upstreamNatsServers: spec.upstreamNatsServers || []
  }
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

async function _getFogExtraInformation (fog, transaction, options = {}) {
  const fogUuid = fog.uuid
  const parsedSpec = await FogPlatformSpecManager.getParsedSpec(fogUuid, transaction)
  const routerConfig = await _getFogRouterConfig(fog, parsedSpec, transaction)
  const natsConfig = await _getFogNatsConfig(fog, parsedSpec, transaction)
  const volumeMounts = await _getFogVolumeMounts(fog, transaction)
  // Transform to plain JS object
  if (fog.toJSON && typeof fog.toJSON === 'function') {
    fog = fog.toJSON()
  }
  const { fogType, fogTypeId, architecture, ...fogFields } = fog
  const archId = fogFields.archId
  const arch = architecture
    ? {
        id: architecture.id,
        name: architecture.name,
        image: architecture.image,
        description: architecture.description
      }
    : undefined
  const result = { ...fogFields, archId, arch, tags: _mapTags(fog), ...routerConfig, ...natsConfig, volumeMounts }
  if (options.includePlatformStatus) {
    const status = await FogPlatformStatusManager.getParsedStatus(fogUuid, transaction)
    result.platformStatus = _formatPlatformStatus(status, parsedSpec ? parsedSpec.generation : null)
  }
  return result
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

  // Filter tags that start with the service annotation key
  const serviceAnnotationTag = getServiceAnnotationTag()
  const serviceTags = fogTags
    .filter(tag => tag.startsWith(serviceAnnotationTag))
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

  return _getFogExtraInformation(fog, transaction, { includePlatformStatus: true })
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

async function refreshProvisionKeyForFog (iofogUuid, transaction) {
  const newProvision = {
    iofogUuid,
    provisionKey: AppHelper.generateUUID(),
    expirationTime: new Date().getTime() + (20 * 60 * 1000)
  }
  return FogProvisionKeyManager.updateOrCreate({ iofogUuid }, newProvision, transaction)
}

async function generateProvisioningKeyEndPoint (fogData, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGenerateProvision)

  const queryFogData = { uuid: fogData.uuid }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  const provisioningKeyData = await refreshProvisionKeyForFog(fogData.uuid, transaction)
  const { getListenerTrustCaBase64 } = require('../utils/tls-config')
  const caCert = getListenerTrustCaBase64()

  return {
    key: provisioningKeyData.provisionKey,
    expirationTime: provisioningKeyData.expirationTime,
    caCert
  }
}

async function setFogVersionCommandEndPoint (fogVersionData, isCLI, transaction) {
  const validationData = {
    uuid: fogVersionData.uuid,
    versionCommand: fogVersionData.versionCommand
  }
  if (fogVersionData.semver != null) {
    validationData.semver = fogVersionData.semver
  }
  await Validator.validate(validationData, Validator.schemas.iofogSetVersionCommand)

  const queryFogData = { uuid: fogVersionData.uuid }

  const newVersionCommand = {
    iofogUuid: fogVersionData.uuid,
    versionCommand: fogVersionData.versionCommand,
    semver: fogVersionData.semver ?? null
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
    filters.forEach((filter) => {
      const fld = filter.key
      const val = filter.value
      const condition = filter.condition
      const isMatchField = (condition === 'equals' && fog[fld] && fog[fld] === val) ||
        (condition === 'has' && fog[fld] && fog[fld].includes(val))
      if (!isMatchField) {
        isMatchFog = false
      }
    })
    if (isMatchFog) {
      filtered.push(fog)
    }
  })
  return filtered
}

async function _processDeleteCommand (fog, transaction) {
  await NatsService.cleanupNatsForFog(fog, transaction)

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
    configLastUpdated: Date.now()
  }

  if (execData.image) {
    const images = [
      { archId: 1, containerImage: execData.image },
      { archId: 2, containerImage: execData.image }
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
      configLastUpdated: debugMicroserviceData.configLastUpdated
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
        { archId: 1, containerImage: execData.image },
        { archId: 2, containerImage: execData.image }
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
          { archId: 1, containerImage: execData.image },
          { archId: 2, containerImage: execData.image }
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
function _buildTcpListenerForFog (service) {
  return {
    name: `${service.name}-listener`,
    port: service.bridgePort.toString(),
    address: service.name
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
    microserviceUuid
  }, transaction)
  return _createMicroserviceImages({ uuid: microserviceUuid }, images, transaction)
}

module.exports = {
  createFogEndPoint: TransactionDecorator.generateTransaction(createFogEndPoint),
  updateFogEndPoint: TransactionDecorator.generateTransaction(updateFogEndPoint),
  deleteFogEndPoint: TransactionDecorator.generateTransaction(deleteFogEndPoint),
  reconcileFogEndpoint: TransactionDecorator.generateTransaction(reconcileFogEndpoint),
  getFogEndPoint: TransactionDecorator.generateTransaction(getFogEndPoint),
  getFogListEndPoint: TransactionDecorator.generateTransaction(getFogListEndPoint),
  generateProvisioningKeyEndPoint: TransactionDecorator.generateTransaction(generateProvisioningKeyEndPoint),
  setFogVersionCommandEndPoint: TransactionDecorator.generateTransaction(setFogVersionCommandEndPoint),
  setFogRebootCommandEndPoint: TransactionDecorator.generateTransaction(setFogRebootCommandEndPoint),
  getHalHardwareInfoEndPoint: TransactionDecorator.generateTransaction(getHalHardwareInfoEndPoint),
  getHalUsbInfoEndPoint: TransactionDecorator.generateTransaction(getHalUsbInfoEndPoint),
  getFog,
  refreshProvisionKeyForFog,
  setFogPruneCommandEndPoint: TransactionDecorator.generateTransaction(setFogPruneCommandEndPoint),
  enableNodeExecEndPoint: TransactionDecorator.generateTransaction(enableNodeExecEndPoint),
  disableNodeExecEndPoint: TransactionDecorator.generateTransaction(disableNodeExecEndPoint),
  _extractServiceTags,
  _findMatchingServices,
  _buildTcpListenerForFog,
  _getRouterMicroserviceConfig,
  _extractExistingTcpConnectors,
  _mergeTcpConnector,
  _mergeTcpListener,
  checkKubernetesEnvironment,
  _handleRouterCertificates,
  _deleteFogRouter,
  _processDeleteCommand,
  _reconcileNatsCertificatesOnHostChange,
  _deleteNatsMicroserviceByFog,
  _createHalMicroserviceForFog,
  _deleteHalMicroserviceByFog,
  _createBluetoothMicroserviceForFog,
  _deleteBluetoothMicroserviceByFog,
  _updateMicroserviceExtraHosts
}
