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

const AppHelper = require('../helpers/app-helper')
const CatalogService = require('../services/catalog-service')
const ChangeTrackingService = require('../services/change-tracking-service')
const Constants = require('../helpers/constants')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceCapAddManager = require('../data/managers/microservice-cap-add-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const MicroservicePortManager = require('../data/managers/microservice-port-manager')
const RouterConnectionManager = require('../data/managers/router-connection-manager')
const RouterManager = require('../data/managers/router-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')
const ldifferenceWith = require('lodash/differenceWith')
const constants = require('../helpers/constants')
const MicroserviceEnvManager = require('../data/managers/microservice-env-manager')
const SecretManager = require('../data/managers/secret-manager')
const FogManager = require('../data/managers/iofog-manager')
const config = require('../config')
const VolumeMountService = require('./volume-mount-service')
const VolumeMappingManager = require('../data/managers/volume-mapping-manager')
const {
  ensureSystemApplication,
  getSystemMicroserviceName
} = require('../helpers/system-naming')

const SITE_CONFIG_VERSION = 'iofog'
const SITE_CONFIG_NAMESPACE = process.env.CONTROLLER_NAMESPACE || config.get('app.namespace')
const SSL_PROFILE_PATH = '/etc/skupper-router-certs'
const SYSTEM_DEFAULT_CA_PATH = '/etc/pki/tls/certs/ca-bundle.crt'

function _sslProfileCertPath (profileName, filename) {
  return `${SSL_PROFILE_PATH}/${profileName}/${filename}`
}

async function validateAndReturnUpstreamRouters (upstreamRouterIds, isSystemFog, defaultRouter, transaction) {
  if (!upstreamRouterIds) {
    if (!defaultRouter) {
      // System fog will be created without default router already existing
      if (isSystemFog) { return [] }
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, Constants.DEFAULT_ROUTER_NAME))
    }

    // Get all system fogs
    const allSystemFogs = await FogManager.findAll({ isSystem: true }, transaction)

    // Get routers for each system fog
    const systemFogRouters = []
    for (const systemFog of allSystemFogs) {
      const systemFogRouter = await RouterManager.findOne({ iofogUuid: systemFog.uuid }, transaction)
      if (systemFogRouter) {
        systemFogRouters.push(systemFogRouter)
      }
    }

    // Combine default router with system fog routers, removing duplicates
    const combinedRouters = [defaultRouter]
    for (const systemFogRouter of systemFogRouters) {
      // Check if this system fog router is not the same as the default router
      if (systemFogRouter.id !== defaultRouter.id) {
        combinedRouters.push(systemFogRouter)
      }
    }

    return combinedRouters
  }

  const upstreamRouters = []
  for (const upstreamRouterId of upstreamRouterIds) {
    let upstreamRouter = upstreamRouterId === Constants.DEFAULT_ROUTER_NAME ? defaultRouter : await RouterManager.findOne({ iofogUuid: upstreamRouterId }, transaction)
    if (!upstreamRouter && upstreamRouterId !== Constants.DEFAULT_ROUTER_NAME) {
      const fog = await FogManager.findOne({ name: upstreamRouterId }, transaction)
      if (!fog) {
        throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, upstreamRouterId))
      }
      upstreamRouter = await RouterManager.findOne({ iofogUuid: fog.uuid }, transaction)
    }
    if (!upstreamRouter) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, upstreamRouterId))
    }
    if (upstreamRouter.isEdge) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_UPSTREAM_ROUTER, upstreamRouterId))
    }

    upstreamRouters.push(upstreamRouter)
  }
  return upstreamRouters
}

async function createRouterForFog (fogData, uuid, upstreamRouters, transaction) {
  const isEdge = fogData.routerMode === 'edge'
  const messagingPort = fogData.messagingPort || 5671
  // Is default router if we are on a system fog and no other default router already exists
  const isDefault = (fogData.isSystem) ? !(await RouterManager.findOne({ isDefault: true }, transaction)) : false
  const routerData = {
    isEdge,
    messagingPort: messagingPort,
    host: fogData.host,
    edgeRouterPort: !isEdge ? fogData.edgeRouterPort : null,
    interRouterPort: !isEdge ? fogData.interRouterPort : null,
    isDefault: isDefault,
    iofogUuid: uuid
  }

  const router = await RouterManager.create(routerData, transaction)

  const microserviceConfig = await _getRouterMicroserviceConfig(isEdge, uuid, messagingPort, router.interRouterPort, router.edgeRouterPort, fogData.containerEngine, transaction)

  for (const upstreamRouter of upstreamRouters) {
    await RouterConnectionManager.create({ sourceRouter: router.id, destRouter: upstreamRouter.id }, transaction)
    const connectorConfig = await _getRouterConnectorConfig(isEdge, upstreamRouter, uuid, transaction)
    microserviceConfig.connectors[connectorConfig.name] = connectorConfig
  }

  const routerMicroservice = await _createRouterMicroservice(isEdge, uuid, microserviceConfig, transaction)
  await _createRouterPorts(routerMicroservice.uuid, messagingPort, transaction)
  if (!isEdge) {
    await _createRouterPorts(routerMicroservice.uuid, fogData.edgeRouterPort, transaction)
    await _createRouterPorts(routerMicroservice.uuid, fogData.interRouterPort, transaction)
  }
  await _ensureRouterSslVolumeMountsAndMappings(uuid, routerMicroservice.uuid, transaction, false)

  return router
}

async function updateRouter (oldRouter, newRouterData, upstreamRouters, containerEngine, transaction) {
  const routerCatalog = await CatalogService.getRouterCatalogItem(transaction)
  const routerMicroservice = await MicroserviceManager.findOne({
    catalogItemId: routerCatalog.id,
    iofogUuid: oldRouter.iofogUuid
  }, transaction)

  if (newRouterData.isEdge && !oldRouter.isEdge) {
    // Moving from internal to edge mode
    // If there are downstream routers, return error
    const downstreamRouterConnections = await RouterConnectionManager.findAll({ destRouter: oldRouter.id }, transaction)
    if (downstreamRouterConnections && downstreamRouterConnections.length) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.EDGE_ROUTER_HAS_DOWNSTREAM, oldRouter.id))
    }
    // Removing any possible connecting port
    newRouterData.edgeRouterPort = null
    newRouterData.interRouterPort = null
    await _deleteRouterPorts(routerMicroservice.uuid, oldRouter.edgeRouterPort, transaction)
    await _deleteRouterPorts(routerMicroservice.uuid, oldRouter.interRouterPort, transaction)
  } else if (!newRouterData.isEdge && oldRouter.isEdge) {
    // Moving from edge to internal
    // Nothing specific to update
    await _createRouterPorts(routerMicroservice.uuid, newRouterData.edgeRouterPort, transaction)
    await _createRouterPorts(routerMicroservice.uuid, newRouterData.interRouterPort, transaction)
  }
  newRouterData.messagingPort = newRouterData.messagingPort || 5671
  await RouterManager.update({ id: oldRouter.id }, newRouterData, transaction)

  // Update upstream routers
  const upstreamConnections = await RouterConnectionManager.findAllWithRouters({ sourceRouter: oldRouter.id }, transaction)
  const upstreamToDelete = ldifferenceWith(upstreamConnections, upstreamRouters, (connection, router) => connection.destRouter === router.id)
  for (const connectionToDelete of upstreamToDelete) {
    await RouterConnectionManager.delete({ id: connectionToDelete.id }, transaction)
  }
  const upstreamToCreate = ldifferenceWith(upstreamRouters, upstreamConnections, (router, connection) => connection.destRouter === router.id)
  await RouterConnectionManager.bulkCreate(upstreamToCreate.map(router => ({ sourceRouter: oldRouter.id, destRouter: router.id })), transaction)

  // Update proxy microservice (If port or host changed)
  // const proxyCatalog = await CatalogService.getProxyCatalogItem(transaction)
  // const existingProxy = await MicroserviceManager.findOne({ iofogUuid: oldRouter.iofogUuid, catalogItemId: proxyCatalog.id }, transaction)
  // if (existingProxy) {
  //   const config = JSON.parse(existingProxy.config || '{}')
  //   config.networkRouter = {
  //     host: newRouterData.host || oldRouter.host,
  //     port: newRouterData.messagingPort
  //   }
  //   await MicroserviceManager.updateIfChanged({ uuid: existingProxy.uuid }, { config: JSON.stringify(config) }, transaction)
  // }

  // Update config if needed
  await updateConfig(oldRouter.id, containerEngine, transaction)
  await ChangeTrackingService.update(oldRouter.iofogUuid, ChangeTrackingService.events.routerChanged, transaction)
  await ChangeTrackingService.update(oldRouter.iofogUuid, ChangeTrackingService.events.microserviceList, transaction)
  await ChangeTrackingService.update(oldRouter.iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)

  return {
    host: 'localhost',
    messagingPort: newRouterData.messagingPort
  }
}

async function _deleteRouterPorts (routerMicroserviceUuid, port, transaction) {
  if (!routerMicroserviceUuid) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER))
  }
  await MicroservicePortManager.delete({ microserviceUuid: routerMicroserviceUuid, portInternal: port }, transaction)
}

async function _updateRouterPorts (routerMicroserviceUuid, router, transaction) {
  await MicroservicePortManager.delete({ microserviceUuid: routerMicroserviceUuid }, transaction)
  await _createRouterPorts(routerMicroserviceUuid, router.messagingPort, transaction)
  if (!router.isEdge) {
    await _createRouterPorts(routerMicroserviceUuid, router.edgeRouterPort, transaction)
    await _createRouterPorts(routerMicroserviceUuid, router.interRouterPort, transaction)
  }
}

async function updateConfig (routerID, containerEngine, transaction) {
  const router = await RouterManager.findOne({ id: routerID }, transaction)
  if (!router) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, routerID))
  }

  // Get current configuration
  const routerCatalog = await CatalogService.getRouterCatalogItem(transaction)
  const routerMicroservice = await MicroserviceManager.findOne({
    catalogItemId: routerCatalog.id,
    iofogUuid: router.iofogUuid
  }, transaction)

  if (!routerMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, router.id))
  }

  const currentConfig = JSON.parse(routerMicroservice.config || '{}')

  // Generate new configuration
  const newConfig = await _getRouterMicroserviceConfig(
    router.isEdge,
    router.iofogUuid,
    router.messagingPort,
    router.interRouterPort,
    router.edgeRouterPort,
    containerEngine,
    transaction
  )

  // Add connectors for upstream routers
  const upstreamRoutersConnections = await RouterConnectionManager.findAllWithRouters(
    { sourceRouter: router.id },
    transaction
  )

  for (const upstreamRouterConnection of upstreamRoutersConnections) {
    const connectorConfig = await _getRouterConnectorConfig(
      router.isEdge,
      upstreamRouterConnection.dest,
      router.iofogUuid,
      transaction
    )
    newConfig.connectors[connectorConfig.name] = connectorConfig
  }

  await _ensureRouterSslVolumeMountsAndMappings(router.iofogUuid, routerMicroservice.uuid, transaction, true)
  await ChangeTrackingService.update(router.iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)

  // Check if configuration needs update
  if (JSON.stringify(currentConfig) !== JSON.stringify(newConfig)) {
    await MicroserviceManager.update(
      { uuid: routerMicroservice.uuid },
      { config: JSON.stringify(newConfig) },
      transaction
    )

    // Check if listeners changed
    if (_listenersChanged(currentConfig.listeners, newConfig.listeners)) {
      await _updateRouterPorts(routerMicroservice.uuid, router, transaction)
      await MicroserviceManager.update(
        { uuid: routerMicroservice.uuid },
        { rebuild: true },
        transaction
      )
      await ChangeTrackingService.update(
        router.iofogUuid,
        ChangeTrackingService.events.microserviceList,
        transaction
      )
    } else {
      // await MicroserviceManager.update(
      //   { uuid: routerMicroservice.uuid },
      //   { rebuild: true },
      //   transaction
      // )
      await ChangeTrackingService.update(
        router.iofogUuid,
        ChangeTrackingService.events.microserviceConfig,
        transaction
      )
    }
  }
}

function _listenersChanged (currentListeners, newListeners) {
  if (!currentListeners || !newListeners) {
    return true
  }

  // Convert to arrays if they're objects
  const currentArray = Object.values(currentListeners)
  const newArray = Object.values(newListeners)

  if (currentArray.length !== newArray.length) {
    return true
  }

  // Compare only port property
  for (const currentListener of currentArray) {
    const matchingListener = newArray.find(l => l.port === currentListener.port)
    if (!matchingListener) {
      return true
    }
  }

  return false
}

function _createRouterPorts (routerMicroserviceUuid, port, transaction) {
  // Skip port mapping for default AMQP listener (5672)
  if (port === 5672) {
    return Promise.resolve()
  }

  const mappingData = {
    // isPublic: false,
    portInternal: port,
    portExternal: port,
    microserviceUuid: routerMicroserviceUuid
  }

  return MicroservicePortManager.create(mappingData, transaction)
}

async function _createRouterMicroservice (isEdge, uuid, microserviceConfig, transaction) {
  const routerCatalog = await CatalogService.getRouterCatalogItem(transaction)
  const hostNetworkMode = !isEdge
  const fog = await FogManager.findOne({ uuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, uuid))
  }
  const application = await ensureSystemApplication(fog, transaction)
  const routerMicroserviceData = {
    uuid: AppHelper.generateUUID(),
    name: getSystemMicroserviceName('router'),
    config: JSON.stringify(microserviceConfig),
    catalogItemId: routerCatalog.id,
    iofogUuid: uuid,
    hostNetworkMode: hostNetworkMode,
    isPrivileged: false,
    logSize: constants.MICROSERVICE_DEFAULT_LOG_SIZE,
    schedule: 0,
    configLastUpdated: Date.now(),
    env: [
      {
        key: 'QDROUTERD_CONF',
        value: '/tmp/skrouterd.json'
      },
      {
        key: 'SSL_PROFILE_PATH',
        value: SSL_PROFILE_PATH
      },
      {
        key: 'QDROUTERD_CONF_TYPE',
        value: 'json'
      },
      {
        key: 'SKUPPER_SITE_ID',
        value: uuid
      },
      {
        key: 'SKUPPER_PLATFORM',
        value: 'iofog'
      }
    ]
  }

  const capAddValues = [
    { capAdd: 'NET_RAW' }
  ]
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, `system-${fog.name}`))
  }
  routerMicroserviceData.applicationId = application.id
  const routerMicroservice = await MicroserviceManager.create(routerMicroserviceData, transaction)
  await MicroserviceStatusManager.create({ microserviceUuid: routerMicroserviceData.uuid }, transaction)
  await MicroserviceExecStatusManager.create({ microserviceUuid: routerMicroserviceData.uuid }, transaction)
  for (const capAdd of capAddValues) {
    await MicroserviceCapAddManager.create({
      microserviceUuid: routerMicroserviceData.uuid,
      capAdd: capAdd.capAdd
    }, transaction)
  }

  // Create environment variables
  for (const env of routerMicroserviceData.env) {
    await MicroserviceEnvManager.create({
      microserviceUuid: routerMicroserviceData.uuid,
      key: env.key,
      value: env.value
    }, transaction)
  }

  return routerMicroservice
}

async function _getRouterConnectorConfig (isEdge, dest, uuid, transaction) {
  const fog = await FogManager.findOne({ uuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, uuid))
  }
  const config = {
    name: dest.iofogUuid || Constants.DEFAULT_ROUTER_NAME,
    role: isEdge ? 'edge' : 'inter-router',
    host: dest.host,
    port: (isEdge ? dest.edgeRouterPort : dest.interRouterPort).toString(),
    sslProfile: `router-site-server-${fog.name}`
  }

  return config
}

async function _getRouterMicroserviceConfig (isEdge, uuid, messagingPort, interRouterPort, edgeRouterPort, containerEngine, transaction) {
  const fog = await FogManager.findOne({ uuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, uuid))
  }
  // Get SSL secrets for all profiles
  const siteServerSecret = await SecretManager.getSecret(`router-site-server-${fog.name}`, transaction)
  const localServerSecret = await SecretManager.getSecret(`router-local-server-${fog.name}`, transaction)
  const localAgentSecret = await SecretManager.getSecret(`router-local-agent-${fog.name}`, transaction)
  let platform = 'docker'
  if (containerEngine === 'podman') {
    platform = 'podman'
  }

  const config = {
    addresses: {
      mc: {
        prefix: 'mc',
        distribution: 'multicast'
      }
    },
    bridges: {
      tcpConnectors: {},
      tcpListeners: {}
    },
    connectors: {},
    listeners: {},
    logConfig: {
      ROUTER_CORE: {
        enable: 'error+',
        module: 'ROUTER_CORE'
      }
    },
    metadata: {
      helloMaxAgeSeconds: '3',
      id: uuid,
      mode: isEdge ? 'edge' : 'interior'
    },
    siteConfig: {
      name: uuid,
      namespace: SITE_CONFIG_NAMESPACE,
      platform: platform,
      version: SITE_CONFIG_VERSION
    },
    sslProfiles: {}
  }

  // Add system-default SSL profile (CA bundle path on host)
  config.sslProfiles['system-default'] = {
    name: 'system-default',
    caCertFile: SYSTEM_DEFAULT_CA_PATH
  }

  function addSslProfileFromSecret (profileName, secret) {
    if (!secret) return
    const profile = { name: profileName }
    if (secret.data && secret.data['ca.crt']) {
      profile.caCertFile = _sslProfileCertPath(secret.name, 'ca.crt')
    }
    if (secret.data && secret.data['tls.crt']) {
      profile.certFile = _sslProfileCertPath(profileName, 'tls.crt')
    }
    if (secret.data && secret.data['tls.key']) {
      profile.privateKeyFile = _sslProfileCertPath(profileName, 'tls.key')
    }
    config.sslProfiles[profileName] = profile
  }

  addSslProfileFromSecret(`router-site-server-${fog.name}`, siteServerSecret)
  addSslProfileFromSecret(`router-local-server-${fog.name}`, localServerSecret)
  addSslProfileFromSecret(`router-local-agent-${fog.name}`, localAgentSecret)

  // Add default AMQP listener (internal)
  config.listeners[`${uuid}-amqp`] = {
    host: '0.0.0.0',
    name: `${uuid}-amqp`,
    port: 5672,
    role: 'normal'
  }

  // Add AMQPS listener
  const amqpsListener = {
    host: '0.0.0.0',
    name: `${uuid}-amqps`,
    port: messagingPort,
    role: 'normal',
    authenticatePeer: true,
    saslMechanisms: 'EXTERNAL',
    sslProfile: `router-local-server-${fog.name}`
  }
  config.listeners[`${uuid}-amqps`] = amqpsListener

  if (!isEdge) {
    // Add inter-router listener
    const interRouterListener = {
      host: '0.0.0.0',
      name: `${uuid}-inter-router`,
      port: interRouterPort,
      role: 'inter-router',
      authenticatePeer: true,
      saslMechanisms: 'EXTERNAL',
      sslProfile: `router-site-server-${fog.name}`
    }
    config.listeners[`${uuid}-inter-router`] = interRouterListener

    // Add edge listener
    const edgeListener = {
      host: '0.0.0.0',
      name: `${uuid}-edge`,
      port: edgeRouterPort,
      role: 'edge',
      authenticatePeer: true,
      saslMechanisms: 'EXTERNAL',
      sslProfile: `router-site-server-${fog.name}`
    }
    config.listeners[`${uuid}-edge`] = edgeListener
  }

  return config
}

const ROUTER_SSL_PROFILE_NAMES = (name) => [
  `router-site-server-${name}`,
  `router-local-server-${name}`,
  `router-local-agent-${name}`
]

async function _ensureRouterSslVolumeMountsAndMappings (iofogUuid, routerMicroserviceUuid, transaction, doCleanup = false) {
  const fog = await FogManager.findOne({ uuid: iofogUuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, iofogUuid))
  }
  const profileNames = ROUTER_SSL_PROFILE_NAMES(fog.name)
  const profileNamesWithSecret = new Set()

  for (const name of profileNames) {
    const secret = await SecretManager.getSecret(name, transaction)
    if (!secret) continue

    profileNamesWithSecret.add(name)

    // Volume mount: get or create, then link to fog if not already linked
    try {
      await VolumeMountService.getVolumeMountEndpoint(name, transaction)
    } catch (err) {
      if (err.name !== 'NotFoundError') throw err
      await VolumeMountService.createVolumeMountEndpoint({ name, secretName: name }, transaction)
    }
    const linkedFogUuids = await VolumeMountService.findVolumeMountedFogNodes(name, transaction)
    if (!linkedFogUuids.includes(iofogUuid)) {
      await VolumeMountService.linkVolumeMountEndpoint(name, [iofogUuid], transaction)
    }

    // Volume mapping: create if not exists
    const containerDest = `${SSL_PROFILE_PATH}/${name}`
    const existingMapping = await VolumeMappingManager.findOne({
      microserviceUuid: routerMicroserviceUuid,
      hostDestination: name,
      containerDestination: containerDest,
      type: 'volumeMount'
    }, transaction)
    if (!existingMapping) {
      await VolumeMappingManager.create({
        microserviceUuid: routerMicroserviceUuid,
        hostDestination: name,
        containerDestination: containerDest,
        accessMode: 'ro',
        type: 'volumeMount'
      }, transaction)
    }
  }

  // Cleanup: remove router SSL volume mappings whose profile no longer has a secret
  if (doCleanup) {
    const currentMappings = await VolumeMappingManager.findAll(
      { microserviceUuid: routerMicroserviceUuid },
      transaction
    )
    for (const mapping of currentMappings) {
      const isRouterSsl = mapping.type === 'volumeMount' &&
        mapping.containerDestination &&
        mapping.containerDestination.startsWith(SSL_PROFILE_PATH)
      if (isRouterSsl && mapping.hostDestination && !profileNamesWithSecret.has(mapping.hostDestination)) {
        await VolumeMappingManager.delete({ id: mapping.id }, transaction)
      }
    }
  }
}

async function getNetworkRouter (networkRouterId, transaction) {
  const query = {}
  if (!networkRouterId) {
    query.isDefault = true
  } else {
    query.iofogUuid = networkRouterId
  }
  return RouterManager.findOne(query, transaction)
}

async function getDefaultRouter (transaction) {
  const defaultRouter = await getNetworkRouter(null, transaction)
  if (!defaultRouter) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, Constants.DEFAULT_ROUTER_NAME))
  }

  return {
    host: defaultRouter.host,
    messagingPort: defaultRouter.messagingPort,
    edgeRouterPort: defaultRouter.edgeRouterPort,
    interRouterPort: defaultRouter.interRouterPort
  }
}

async function upsertDefaultRouter (routerData, transaction) {
  await Validator.validate(routerData, Validator.schemas.defaultRouterCreate)

  const createRouterData = {
    isEdge: false,
    messagingPort: routerData.messagingPort || 5671,
    host: routerData.host,
    edgeRouterPort: routerData.edgeRouterPort || 45671,
    interRouterPort: routerData.interRouterPort || 55671,
    isDefault: true
  }

  return RouterManager.updateOrCreate({ isDefault: true }, createRouterData, transaction)
}

async function findOne (option, transaction) {
  return RouterManager.findOne(option, transaction)
}

module.exports = {
  createRouterForFog: TransactionDecorator.generateTransaction(createRouterForFog),
  updateConfig: TransactionDecorator.generateTransaction(updateConfig),
  updateRouter: TransactionDecorator.generateTransaction(updateRouter),
  getDefaultRouter: TransactionDecorator.generateTransaction(getDefaultRouter),
  getNetworkRouter: TransactionDecorator.generateTransaction(getNetworkRouter),
  upsertDefaultRouter: TransactionDecorator.generateTransaction(upsertDefaultRouter),
  validateAndReturnUpstreamRouters: TransactionDecorator.generateTransaction(validateAndReturnUpstreamRouters),
  findOne: TransactionDecorator.generateTransaction(findOne)
}
