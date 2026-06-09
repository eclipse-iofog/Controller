/*
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
const ServiceManager = require('../data/managers/service-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const RouterManager = require('../data/managers/router-manager')
const RouterConnectionManager = require('../data/managers/router-connection-manager')
const K8sClient = require('../utils/k8s-client')
const AppHelper = require('../helpers/app-helper')
const config = require('../config')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const Validator = require('../schemas')
const logger = require('../logger')
const FogManager = require('../data/managers/iofog-manager')
const TagsManager = require('../data/managers/tags-manager')
const ChangeTrackingService = require('./change-tracking-service')
const ApplicationManager = require('../data/managers/application-manager')
const {
  ensureSystemApplication,
  getSystemMicroserviceName
} = require('../helpers/system-naming')
// const { Op } = require('sequelize')

const K8S_ROUTER_CONFIG_MAP = 'iofog-router'
const SERVICE_ANNOTATION_TAG = 'service.datasance.com/tag'

// Map service tags to string array
// Return plain JS object
function _mapTags (service) {
  return service.tags ? service.tags.map(t => t.value) : []
}

async function _setTags (serviceModel, tagsArray, transaction) {
  if (tagsArray) {
    let tags = []
    for (const tag of tagsArray) {
      let tagModel = await TagsManager.findOne({ value: tag }, transaction)
      if (!tagModel) {
        tagModel = await TagsManager.create({ value: tag }, transaction)
      }
      tags.push(tagModel)
    }
    await serviceModel.setTags(tags)
  }
}

async function handleServiceDistribution (serviceTags, transaction) {
  const tags = Array.isArray(serviceTags) ? serviceTags : (serviceTags ? [].concat(serviceTags) : [])
  logger.debug('handleServiceDistribution: entry', { serviceTagsType: typeof serviceTags, isArray: Array.isArray(serviceTags), tagsLength: tags.length })

  // Always find fog nodes with 'all' tag
  const allTaggedFogNodesRaw = await FogManager.findAllWithTags({
    '$tags.value$': `${SERVICE_ANNOTATION_TAG}: all`
  }, transaction)
  const allTaggedFogNodes = Array.isArray(allTaggedFogNodesRaw) ? allTaggedFogNodesRaw : []
  logger.debug('handleServiceDistribution: allTaggedFogNodes', { length: allTaggedFogNodes.length })

  // If serviceTags is null or empty, return only fog nodes with 'all' tag
  if (!tags.length) {
    const uuids = Array.from(allTaggedFogNodes).map(fog => fog.uuid)
    logger.debug('handleServiceDistribution: early return (no tags)', { uuidsCount: uuids.length })
    return uuids
  }

  // Filter tags that don't contain ':' or '='
  const filteredServiceTags = tags
    .filter(tag => tag != null)
    .map(tag => String(tag))
    .filter(tag => !tag.includes(':') && !tag.includes('='))
    .filter(tag => tag.length > 0)

  if (filteredServiceTags.length === 0) {
    const uuids = Array.from(allTaggedFogNodes).map(fog => fog.uuid)
    logger.debug('handleServiceDistribution: early return (filtered empty)', { uuidsCount: uuids.length })
    return uuids
  }

  // Find fog nodes for each filtered tag
  const specificTaggedFogNodes = new Set()
  for (const tag of filteredServiceTags) {
    const fogNodesRaw = await FogManager.findAllWithTags({
      '$tags.value$': `${SERVICE_ANNOTATION_TAG}: ${tag}`
    }, transaction)
    const fogNodes = Array.isArray(fogNodesRaw) ? fogNodesRaw : []
    fogNodes.forEach(fog => specificTaggedFogNodes.add(fog.uuid))
  }

  // Get all tag fog node UUIDs (force real array for spread)
  const allTagUuids = Array.from(allTaggedFogNodes).map(fog => fog.uuid)
  const allTagUuidsArr = Array.from(allTagUuids)
  const specificArr = Array.from(specificTaggedFogNodes)
  logger.debug('handleServiceDistribution: before Set', { allTagUuidsLength: allTagUuidsArr.length, specificSize: specificArr.length })

  // Combine both sets of fog nodes and remove duplicates
  const allFogUuids = new Set([...allTagUuidsArr, ...specificArr])
  const result = Array.from(allFogUuids)
  logger.debug('handleServiceDistribution: exit', { resultCount: result.length })
  return result
}

async function checkKubernetesEnvironment () {
  const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')
  return controlPlane && controlPlane.toLowerCase() === 'kubernetes'
}

async function validateNonK8sType (serviceConfig) {
  const isK8s = await checkKubernetesEnvironment()
  if (serviceConfig.type.toLowerCase() !== 'k8s' && isK8s) {
    if (!serviceConfig.k8sType || !serviceConfig.servicePort) {
      throw new Errors.ValidationError('Kubernetes environment is required for k8s service type(LoadBalancer or ClusterIP or NodePort) and service port')
    }
  }
}

async function _validateServiceName (serviceConfig) {
  if (serviceConfig.name.toLowerCase() === 'controller' || serviceConfig.name.toLowerCase() === 'router' || serviceConfig.name.toLowerCase() === 'router-internal' || serviceConfig.name.toLowerCase() === 'docker' || serviceConfig.name.toLowerCase() === 'podman' || serviceConfig.name.toLowerCase() === 'kubernetes' || serviceConfig.name.toLowerCase() === 'nats' || serviceConfig.name.toLowerCase() === 'nats-headless' || serviceConfig.name.toLowerCase() === 'nats-server') {
    throw new Errors.ValidationError('Service name cannot be "controller" or "router" or "router-internal" or "docker"')
  }
}

async function validateMicroserviceType (serviceConfig, transaction) {
  if (serviceConfig.type.toLowerCase() !== 'microservice') {
    return
  }

  let microserviceUuid = serviceConfig.resource

  // If resource contains "/", it means user provided "<appName>/<microserviceName>"
  if (serviceConfig.resource.includes('/')) {
    const [appName, microserviceName] = serviceConfig.resource.split('/')
    const app = await ApplicationManager.findOne({ name: appName }, transaction)
    if (!app) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_APPLICATION_NAME, appName))
    }
    const microservice = await MicroserviceManager.findOne({
      name: microserviceName,
      applicationId: app.id
    }, transaction)

    if (!microservice) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_NAME, serviceConfig.resource))
    }

    microserviceUuid = microservice.uuid
  } else {
    // User provided UUID directly, validate if microservice exists
    const microservice = await MicroserviceManager.findOne({ uuid: serviceConfig.resource }, transaction)
    if (!microservice) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, serviceConfig.resource))
    }
  }

  // Update resource to be the microservice UUID
  serviceConfig.resource = microserviceUuid
}

async function validateFogServiceType (serviceConfig, transaction) {
  if (serviceConfig.type.toLowerCase() !== 'agent') {
    return
  }

  // First try to find fog node by name
  let fogNode = await FogManager.findOne({ name: serviceConfig.resource }, transaction)

  // If not found by name, try to find by UUID
  if (!fogNode) {
    fogNode = await FogManager.findOne({ uuid: serviceConfig.resource }, transaction)
  }

  // If still not found, throw error
  if (!fogNode) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, serviceConfig.resource))
  }

  // Always set resource to be the fog node UUID
  serviceConfig.resource = fogNode.uuid
}

async function validateDefaultBridge (serviceConfig, transaction) {
  // If defaultBridge is empty, set it to 'default-router'
  if (!serviceConfig.defaultBridge) {
    logger.debug('Setting default bridge to default-router')
    serviceConfig.defaultBridge = 'default-router'
    return
  }

  // If service type is not microservice or agent, defaultBridge must be 'default-router'
  if (serviceConfig.type.toLowerCase() !== 'microservice' && serviceConfig.type.toLowerCase() !== 'agent') {
    if (serviceConfig.defaultBridge !== 'default-router') {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_DEFAULT_BRIDGE, serviceConfig.defaultBridge))
    }
    return
  }

  // For microservice or agent type, if user provided a UUID instead of 'default-router'
  if (serviceConfig.defaultBridge !== 'default-router') {
    let iofogUuid

    if (serviceConfig.type.toLowerCase() === 'microservice') {
      // Get the microservice to find its iofog node
      const microservice = await MicroserviceManager.findOne({ uuid: serviceConfig.resource }, transaction)
      if (!microservice) {
        throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, serviceConfig.resource))
      }
      iofogUuid = microservice.iofogUuid
    } else if (serviceConfig.type.toLowerCase() === 'agent') {
      // For agent type, the resource is the agent UUID
      iofogUuid = serviceConfig.resource
    }

    // Get the router for the iofog node
    const router = await RouterManager.findOne({ iofogUuid: iofogUuid }, transaction)
    if (!router) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, iofogUuid))
    }

    // Check if the router has a connection to the specified upstream router
    const upstreamRouter = await RouterManager.findOne({ iofogUuid: serviceConfig.defaultBridge }, transaction)
    if (!upstreamRouter) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, serviceConfig.defaultBridge))
    }

    const routerConnection = await RouterConnectionManager.findOne({
      sourceRouter: router.id,
      destRouter: upstreamRouter.id
    }, transaction)

    if (!routerConnection) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER_CONNECTION, serviceConfig.defaultBridge, router.id))
    }
  }
}

async function defineBridgePort (serviceConfig, transaction) {
  // Get bridge port range from environment or config
  const bridgePortRangeStr = process.env.BRIDGE_PORTS_RANGE || config.get('bridgePorts.range') || '10024-65535'
  const [startStr, endStr] = bridgePortRangeStr.split('-')
  const start = parseInt(startStr)
  const end = parseInt(endStr)

  // Get all existing services to check used ports
  const existingServices = await ServiceManager.findAll({}, transaction)
  const usedPorts = new Set(existingServices.map(service => service.bridgePort))

  // Find the first available port in the range
  let bridgePort = start
  while (bridgePort <= end) {
    if (!usedPorts.has(bridgePort)) {
      serviceConfig.bridgePort = bridgePort
      return
    }
    bridgePort++
  }

  // If we get here, no ports are available
  throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NO_AVAILABLE_BRIDGE_PORT, bridgePortRangeStr))
}

// Helper function to determine host based on service type
async function _determineConnectorHost (serviceConfig, transaction) {
  switch (serviceConfig.type.toLowerCase()) {
    case 'microservice':
      const microservice = await MicroserviceManager.findOne({ uuid: serviceConfig.resource }, transaction)
      if (microservice.hostNetworkMode) {
        return 'iofog'
      } else {
        return `iofog_${serviceConfig.resource}`
      }
    case 'agent': // TODO: find agent extract router config mode from agent router mode.
      return 'iofog'
    case 'k8s':
    case 'external':
      return serviceConfig.resource
    default:
      throw new Errors.ValidationError(`Invalid service type: ${serviceConfig.type}`)
  }
}

// Helper function to determine siteId for connector
async function _determineConnectorSiteId (serviceConfig, transaction) {
  switch (serviceConfig.type.toLowerCase()) {
    case 'microservice': {
      const microservice = await MicroserviceManager.findOne({ uuid: serviceConfig.resource }, transaction)
      if (!microservice) {
        throw new Errors.NotFoundError(`Microservice not found: ${serviceConfig.resource}`)
      }
      return microservice.iofogUuid
    }
    case 'agent':
      return serviceConfig.resource
    case 'k8s':
    case 'external':
      return 'default-router'
    default:
      throw new Errors.ValidationError(`Invalid service type: ${serviceConfig.type}`)
  }
}

// Helper function to determine processId for connector
async function _determineConnectorProcessId (serviceConfig) {
  switch (serviceConfig.type.toLowerCase()) {
    case 'microservice':
      return serviceConfig.resource
    case 'agent':
      return `${serviceConfig.resource}-local-${serviceConfig.targetPort}`
    case 'k8s':
      return `${serviceConfig.resource}-k8s-${serviceConfig.targetPort}`
    case 'external':
      return `${serviceConfig.resource}-external-${serviceConfig.targetPort}`
    default:
      throw new Errors.ValidationError(`Invalid service type: ${serviceConfig.type}`)
  }
}

// Helper function to build tcpConnector configuration
async function _buildTcpConnector (serviceConfig, transaction) {
  const host = await _determineConnectorHost(serviceConfig, transaction)
  const siteId = await _determineConnectorSiteId(serviceConfig, transaction)
  const processId = await _determineConnectorProcessId(serviceConfig)

  return {
    name: `${serviceConfig.name}-connector`,
    host,
    port: serviceConfig.targetPort.toString(),
    address: serviceConfig.name,
    siteId,
    processId
  }
}

// Helper function to build tcpListener configuration
async function _buildTcpListener (serviceConfig, fogNodeUuid = null) {
  const listener = {
    name: `${serviceConfig.name}-listener`,
    port: serviceConfig.bridgePort.toString(),
    address: serviceConfig.name,
    siteId: fogNodeUuid || serviceConfig.defaultBridge
  }
  return listener
}

// Helper function to get router microservice by fog node UUID
async function _getRouterMicroservice (fogNodeUuid, transaction) {
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
  return routerMicroservice
}

// Helper function to update router config in Kubernetes environment
async function _updateK8sRouterConfig (config) {
  const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
  if (!configMap) {
    throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
  }

  const patchData = {
    data: {
      'skrouterd.json': JSON.stringify(config)
    }
  }

  await K8sClient.patchConfigMap(K8S_ROUTER_CONFIG_MAP, patchData)
}

// Helper function to update router microservice config
async function _updateRouterMicroserviceConfig (fogNodeUuid, config, transaction) {
  const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)

  // Update microservice with the provided config
  await MicroserviceManager.update(
    { uuid: routerMicroservice.uuid },
    { config: JSON.stringify(config) },
    transaction
  )

  // Update change tracking
  await ChangeTrackingService.update(fogNodeUuid, ChangeTrackingService.events.microserviceConfig, transaction)
}

// Helper function to add tcpConnector to router config
async function _addTcpConnector (serviceConfig, transaction) {
  const isK8s = await checkKubernetesEnvironment()
  const connector = await _buildTcpConnector(serviceConfig, transaction)
  const siteId = connector.siteId

  if (siteId === 'default-router') {
    if (isK8s) {
      // Update K8s router config
      logger.debug('Updating K8s router config')
      const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
      if (!configMap) {
        logger.error('ConfigMap not found:' + K8S_ROUTER_CONFIG_MAP)
        throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
      }

      const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
      // Add new connector to the array
      routerConfig.push(['tcpConnector', connector])

      await _updateK8sRouterConfig(routerConfig)
    } else {
      // Update default router microservice config
      const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
      if (!defaultRouter) {
        logger.error('Default router not found')
        throw new Errors.NotFoundError('Default router not found')
      }
      const fogNodeUuid = defaultRouter.iofogUuid
      const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
      const currentConfig = JSON.parse(routerMicroservice.config || '{}')

      if (!currentConfig.bridges) {
        currentConfig.bridges = {}
      }
      if (!currentConfig.bridges.tcpConnectors) {
        currentConfig.bridges.tcpConnectors = {}
      }
      currentConfig.bridges.tcpConnectors[connector.name] = connector

      await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
    }
  } else {
    // Update specific router microservice config
    const fogNodeUuid = siteId
    const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
    const currentConfig = JSON.parse(routerMicroservice.config || '{}')

    if (!currentConfig.bridges) {
      currentConfig.bridges = {}
    }
    if (!currentConfig.bridges.tcpConnectors) {
      currentConfig.bridges.tcpConnectors = {}
    }
    currentConfig.bridges.tcpConnectors[connector.name] = connector

    await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
  }
}

// Helper function to add tcpListener to router config
async function _addTcpListener (serviceConfig, transaction) {
  const isK8s = await checkKubernetesEnvironment()

  // First handle K8s case if we're in K8s environment
  if (isK8s) {
    const k8sListener = await _buildTcpListener(serviceConfig, null) // null for K8s case
    const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
    if (!configMap) {
      logger.error('ConfigMap not found:' + K8S_ROUTER_CONFIG_MAP)
      throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
    }

    const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
    // Add new listener to the array
    routerConfig.push(['tcpListener', k8sListener])

    await _updateK8sRouterConfig(routerConfig)
  }

  // Handle distributed router microservice cases
  // Get list of fog nodes that need this listener
  const fogNodeUuids = await handleServiceDistribution(serviceConfig.tags, transaction)

  // If not in K8s environment, always include default router
  if (!isK8s) {
    if (serviceConfig.defaultBridge === 'default-router') {
      const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
      if (!defaultRouter) {
        logger.error('Default router not found')
        throw new Errors.NotFoundError('Default router not found')
      }
      // Add default router if not already in the list
      if (!fogNodeUuids.includes(defaultRouter.iofogUuid)) {
        fogNodeUuids.push(defaultRouter.iofogUuid)
      }
    } else {
      if (!fogNodeUuids.includes(serviceConfig.defaultBridge)) {
        fogNodeUuids.push(serviceConfig.defaultBridge)
      }
    }
  }
  // else if (!fogNodeUuids || fogNodeUuids.length === 0) {
  //   // If in K8s and no fog nodes found, add default router
  //   const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  //   if (!defaultRouter) {
  //     logger.error('Default router not found')
  //     throw new Errors.NotFoundError('Default router not found')
  //   }
  //   fogNodeUuids.push(defaultRouter.iofogUuid)
  // }

  // Add listener to each router microservice
  for (const fogNodeUuid of fogNodeUuids) {
    try {
      const listener = await _buildTcpListener(serviceConfig, fogNodeUuid)
      const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
      const currentConfig = JSON.parse(routerMicroservice.config || '{}')
      if (!currentConfig.bridges) currentConfig.bridges = {}
      if (!currentConfig.bridges.tcpListeners) currentConfig.bridges.tcpListeners = {}
      currentConfig.bridges.tcpListeners[listener.name] = listener
      await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
    } catch (err) {
      if (err instanceof Errors.NotFoundError) {
        logger.info(`Router microservice not found for fogNodeUuid ${fogNodeUuid}, skipping.`)
        continue
      }
      throw err
    }
  }
}

// Helper function to update tcpConnector in router config
async function _updateTcpConnector (serviceConfig, transaction) {
  const isK8s = await checkKubernetesEnvironment()
  const connector = await _buildTcpConnector(serviceConfig, transaction)
  const siteId = connector.siteId

  if (siteId === 'default-router') {
    if (isK8s) {
      // Update K8s router config
      const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
      if (!configMap) {
        throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
      }

      const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
      // Find and update the existing connector
      const connectorIndex = routerConfig.findIndex(item =>
        item[0] === 'tcpConnector' && item[1].name === connector.name
      )
      if (connectorIndex !== -1) {
        routerConfig[connectorIndex] = ['tcpConnector', connector]
      }

      await _updateK8sRouterConfig(routerConfig)
    } else {
      // Update default router microservice config
      const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
      if (!defaultRouter) {
        throw new Errors.NotFoundError('Default router not found')
      }
      const fogNodeUuid = defaultRouter.iofogUuid
      const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
      const currentConfig = JSON.parse(routerMicroservice.config || '{}')

      if (!currentConfig.bridges) {
        currentConfig.bridges = {}
      }
      if (!currentConfig.bridges.tcpConnectors) {
        currentConfig.bridges.tcpConnectors = {}
      }
      // Update the connector with the same name
      currentConfig.bridges.tcpConnectors[connector.name] = connector

      await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
    }
  } else {
    // Update specific router microservice config
    const fogNodeUuid = siteId
    const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
    const currentConfig = JSON.parse(routerMicroservice.config || '{}')

    if (!currentConfig.bridges) {
      currentConfig.bridges = {}
    }
    if (!currentConfig.bridges.tcpConnectors) {
      currentConfig.bridges.tcpConnectors = {}
    }
    // Update the connector with the same name
    currentConfig.bridges.tcpConnectors[connector.name] = connector

    await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
  }
}

// // Helper function to update tcpListener in router config
// async function _updateTcpListener (serviceConfig, transaction) {
//   const isK8s = await checkKubernetesEnvironment()

//   // First handle K8s case if we're in K8s environment
//   if (isK8s) {
//     const k8sListener = await _buildTcpListener(serviceConfig, null) // null for K8s case
//     const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
//     if (!configMap) {
//       throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
//     }

//     const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
//     // Update the listener in the array
//     const listenerIndex = routerConfig.findIndex(item =>
//       item[0] === 'tcpListener' && item[1].name === k8sListener.name
//     )
//     if (listenerIndex !== -1) {
//       routerConfig[listenerIndex] = ['tcpListener', k8sListener]
//     } else {
//       routerConfig.push(['tcpListener', k8sListener])
//     }

//     await _updateK8sRouterConfig(routerConfig)
//   }

//   // Handle distributed router microservice cases
//   // Get list of fog nodes that need this listener
//   const fogNodeUuids = await handleServiceDistribution(serviceConfig.tags, transaction)
//   // If not in K8s environment, always include default router
//   if (!isK8s) {
//     const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
//     if (!defaultRouter) {
//       throw new Errors.NotFoundError('Default router not found')
//     }
//     // Add default router if not already in the list
//     if (!fogNodeUuids.includes(defaultRouter.iofogUuid)) {
//       fogNodeUuids.push(defaultRouter.iofogUuid)
//     }
//   }
//   // else if (!fogNodeUuids || fogNodeUuids.length === 0) {
//   //   // If in K8s and no fog nodes found, add default router
//   //   const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
//   //   if (!defaultRouter) {
//   //     throw new Errors.NotFoundError('Default router not found')
//   //   }
//   //   fogNodeUuids.push(defaultRouter.iofogUuid)
//   // }

//   // Update listener in each router microservice
//   for (const fogNodeUuid of fogNodeUuids) {
//     try {
//       const listener = await _buildTcpListener(serviceConfig, fogNodeUuid)
//       const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
//       const currentConfig = JSON.parse(routerMicroservice.config || '{}')

//       if (!currentConfig.bridges) {
//         currentConfig.bridges = {}
//       }
//       if (!currentConfig.bridges.tcpListeners) {
//         currentConfig.bridges.tcpListeners = {}
//       }
//       // Update listener with its name as key
//       currentConfig.bridges.tcpListeners[listener.name] = listener

//       await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
//     } catch (err) {
//       if (err instanceof Errors.NotFoundError) {
//         logger.info(`Router microservice not found for fogNodeUuid ${fogNodeUuid}, skipping.`)
//         continue
//       }
//       throw err
//     }
//   }
// }

// Helper function to delete tcpConnector from router config
async function _deleteTcpConnector (serviceName, transaction) {
  logger.debug('_deleteTcpConnector: start', { serviceName })
  const isK8s = await checkKubernetesEnvironment()
  const connectorName = `${serviceName}-connector`

  // Get service to determine if it's using default router
  const service = await ServiceManager.findOne({ name: serviceName }, transaction)
  if (!service) {
    throw new Errors.NotFoundError(`Service not found: ${serviceName}`)
  }
  logger.debug('_deleteTcpConnector: service', { type: service.type, resource: service.resource, defaultBridge: service.defaultBridge })

  const isDefaultRouter = service.defaultBridge === 'default-router'
  let microserviceSource = null
  if (service.type === 'microservice') {
    microserviceSource = await MicroserviceManager.findOne({ uuid: service.resource }, transaction)
  }
  let fogSource = null
  if (service.type === 'agent') {
    fogSource = await FogManager.findOne({ uuid: service.resource }, transaction)
    if (!fogSource) {
      fogSource = await FogManager.findOne({ name: service.resource }, transaction)
    }
  }

  if (isDefaultRouter && (!microserviceSource || !fogSource)) {
    logger.debug('_deleteTcpConnector: updating default router config')
    if (isK8s) {
      // Update K8s router config
      const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
      if (!configMap) {
        throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
      }

      const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
      // Remove the connector from the array
      const updatedConfig = routerConfig.filter(item =>
        !(item[0] === 'tcpConnector' && item[1].name === connectorName)
      )

      await _updateK8sRouterConfig(updatedConfig)
    } else {
      // Update default router microservice config
      const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
      if (!defaultRouter) {
        throw new Errors.NotFoundError('Default router not found')
      }
      const fogNodeUuid = defaultRouter.iofogUuid
      const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
      const currentConfig = JSON.parse(routerMicroservice.config || '{}')

      if (currentConfig.bridges && currentConfig.bridges.tcpConnectors) {
        delete currentConfig.bridges.tcpConnectors[connectorName]
      }

      await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
    }
    logger.debug('_deleteTcpConnector: done (default router updated)')
    return
  }

  let fogNodeUuid = null
  if (!isDefaultRouter && (!microserviceSource || !fogSource)) {
    fogNodeUuid = service.defaultBridge
  }
  if (microserviceSource) {
    fogNodeUuid = microserviceSource.iofogUuid
  }
  if (fogSource) {
    fogNodeUuid = fogSource.uuid
  }
  logger.debug('_deleteTcpConnector: fogNodeUuid for non-default', { fogNodeUuid })
  const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
  const currentConfig = JSON.parse(routerMicroservice.config || '{}')

  if (currentConfig.bridges && currentConfig.bridges.tcpConnectors) {
    delete currentConfig.bridges.tcpConnectors[connectorName]
  }

  logger.debug('_deleteTcpConnector: updating router config', { fogNodeUuid })
  await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
  logger.debug('_deleteTcpConnector: done')
}

// Helper function to delete tcpListener from router config
async function _deleteTcpListener (serviceName, transaction) {
  logger.debug('_deleteTcpListener: start', { serviceName })
  const isK8s = await checkKubernetesEnvironment()
  const listenerName = `${serviceName}-listener`

  // First handle K8s case if we're in K8s environment
  if (isK8s) {
    const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
    if (!configMap) {
      throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
    }

    const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
    // Remove the listener from the array
    const updatedConfig = routerConfig.filter(item =>
      !(item[0] === 'tcpListener' && item[1].name === listenerName)
    )

    await _updateK8sRouterConfig(updatedConfig)
  }

  // Get service to determine its tags for distribution
  const service = await ServiceManager.findOneWithTags({ name: serviceName }, transaction)
  if (!service) {
    throw new Errors.NotFoundError(`Service not found: ${serviceName}`)
  }
  logger.debug('_deleteTcpListener: service', { type: service.type, hasTags: !!service.tags, tagsIsArray: Array.isArray(service.tags) })

  let microserviceSource = null
  if (service.type === 'microservice') {
    microserviceSource = await MicroserviceManager.findOne({ uuid: service.resource }, transaction)
  }
  // Handle distributed router microservice cases
  // Get list of fog nodes that need this listener removed
  const serviceTags = (service.tags && Array.isArray(service.tags)) ? service.tags.map(tag => tag.value) : []
  logger.debug('_deleteTcpListener: calling handleServiceDistribution', { serviceTagsLength: serviceTags.length, serviceTagsSample: serviceTags.slice(0, 3) })
  const fogNodeUuids = await handleServiceDistribution(serviceTags, transaction)
  logger.debug('_deleteTcpListener: handleServiceDistribution returned', { fogNodeUuidsLength: fogNodeUuids ? fogNodeUuids.length : 'null/undefined', isArray: Array.isArray(fogNodeUuids) })

  if (microserviceSource) {
    if (!fogNodeUuids.includes(microserviceSource.iofogUuid)) {
      fogNodeUuids.push(microserviceSource.iofogUuid)
    }
  }
  // If not in K8s environment, always include default router
  if (!isK8s) {
    const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
    if (!defaultRouter) {
      throw new Errors.NotFoundError('Default router not found')
    }
    // Add default router if not already in the list
    if (!fogNodeUuids.includes(defaultRouter.iofogUuid)) {
      fogNodeUuids.push(defaultRouter.iofogUuid)
    }
  }
  // else if (!fogNodeUuids || fogNodeUuids.length === 0) {
  //   // If in K8s and no fog nodes found, add default router
  //   const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  //   if (!defaultRouter) {
  //     throw new Errors.NotFoundError('Default router not found')
  //   }
  //   fogNodeUuids.push(defaultRouter.iofogUuid)
  // }

  // Remove listener from each router microservice
  const fogList = Array.isArray(fogNodeUuids) ? fogNodeUuids : []
  logger.debug('_deleteTcpListener: iterating router configs', { count: fogList.length })
  for (const fogNodeUuid of fogList) {
    try {
      const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
      const currentConfig = JSON.parse(routerMicroservice.config || '{}')
      if (currentConfig.bridges && currentConfig.bridges.tcpListeners) {
        delete currentConfig.bridges.tcpListeners[listenerName]
      }
      await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
    } catch (err) {
      if (err instanceof Errors.NotFoundError) {
        logger.info('_deleteTcpListener: router microservice not found, skipping', { fogNodeUuid })
        continue
      }
      logger.error('_deleteTcpListener: error updating router config', { fogNodeUuid, message: err.message })
      throw err
    }
  }
  logger.debug('_deleteTcpListener: done')
}

// Common labels for Kubernetes services created by the controller
function _getK8sServiceLabels () {
  return {
    'app.kubernetes.io/name': 'pot',
    'app.kubernetes.io/component': 'controller',
    'app.kubernetes.io/managed-by': 'controller',
    'datasance.com/component': 'router',
    'app.kubernetes.io/instance': process.env.CONTROLLER_NAME || config.get('app.name')
  }
}

// Helper function to create Kubernetes service
async function _createK8sService (serviceConfig, transaction) {
  const normalizedTags = serviceConfig.tags.map(tag => tag.includes(':') ? tag : `${tag}:`)
  const serviceSpec = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: serviceConfig.name,
      labels: _getK8sServiceLabels(),
      annotations: normalizedTags.reduce((acc, tag) => {
        const [key, value] = tag.split(':')
        acc[key] = (value || '').trim()
        return acc
      }, {})
    },
    spec: {
      type: serviceConfig.k8sType,
      selector: {
        'datasance.com/component': 'router'
      },
      ports: [{
        name: 'pot-service',
        targetPort: parseInt(serviceConfig.bridgePort),
        port: parseInt(serviceConfig.servicePort),
        protocol: 'TCP'
      }]
    }
  }

  const service = await K8sClient.createService(serviceSpec)

  // If LoadBalancer type, wait for and set the external IP
  if (serviceConfig.k8sType === 'LoadBalancer') {
    const loadBalancerIP = await K8sClient.watchLoadBalancerIP(serviceConfig.name)
    if (loadBalancerIP) {
      await ServiceManager.update(
        { name: serviceConfig.name },
        { serviceEndpoint: loadBalancerIP },
        transaction
      )
    }
  }

  return service
}

// Helper function to update Kubernetes service
async function _updateK8sService (serviceConfig, transaction) {
  const existingService = await K8sClient.getService(serviceConfig.name)
  if (!existingService) {
    logger.debug(`Service not found: ${serviceConfig.name}, creating new service`)
    const service = await _createK8sService(serviceConfig, transaction)
    return service
  } else {
    const normalizedTags = serviceConfig.tags.map(tag => tag.includes(':') ? tag : `${tag}:`)
    const patchData = {
      metadata: {
        labels: _getK8sServiceLabels(),
        annotations: normalizedTags.reduce((acc, tag) => {
          const [key, value] = tag.split(':')
          acc[key] = (value || '').trim()
          return acc
        }, {})
      },
      spec: {
        type: serviceConfig.k8sType,
        selector: {
          'datasance.com/component': 'router'
        },
        ports: [{
          name: 'pot-service',
          port: parseInt(serviceConfig.servicePort),
          targetPort: parseInt(serviceConfig.bridgePort),
          protocol: 'TCP'
        }]
      }
    }

    logger.debug(`Updating service: ${serviceConfig.name}`)
    const updatedService = await K8sClient.updateService(serviceConfig.name, patchData)

    // If LoadBalancer type, wait for and set the external IP
    if (serviceConfig.k8sType === 'LoadBalancer') {
      const loadBalancerIP = await K8sClient.watchLoadBalancerIP(serviceConfig.name)
      if (loadBalancerIP) {
        await ServiceManager.update(
          { name: serviceConfig.name },
          { serviceEndpoint: loadBalancerIP },
          transaction
        )
      }
    }
    return updatedService
  }
}

// Helper function to delete Kubernetes service
async function _deleteK8sService (serviceName) {
  try {
    await K8sClient.deleteService(serviceName, { ignoreNotFound: true })
  } catch (error) {
    logger.warn(`Failed to delete K8s service ${serviceName}: ${error.message}`)
    // Do not throw, so the flow continues
  }
}

// Create service endpoint
async function createServiceEndpoint (serviceData, transaction) {
  logger.debug('Creating service with data:' + JSON.stringify(serviceData))

  // 1. Validate from schemas validator
  await Validator.validate(serviceData, Validator.schemas.serviceCreate)
  await _validateServiceName(serviceData)

  // 2. Check K8s environment if type is k8s
  const isK8s = await checkKubernetesEnvironment()
  if (serviceData.type === 'k8s' && !isK8s) {
    throw new Errors.ValidationError('Kubernetes environment is required for k8s service type')
  }

  if (serviceData.type !== 'k8s' && isK8s) {
    logger.debug('Validating non k8s service type')
    await validateNonK8sType(serviceData)
  }

  // 3. Validate microservice type
  if (serviceData.type === 'microservice') {
    await validateMicroserviceType(serviceData, transaction)
  }

  // 4. Validate agent type
  if (serviceData.type === 'agent') {
    logger.debug('Validating agent service type')
    await validateFogServiceType(serviceData, transaction)
  }

  // 5. Validate default bridge
  logger.debug('Validating default bridge')
  await validateDefaultBridge(serviceData, transaction)

  logger.debug('Defining bridge port')
  // 6. Define bridge port
  await defineBridgePort(serviceData, transaction)

  // Set provisioning fields
  serviceData.provisioningStatus = 'pending'
  serviceData.provisioningError = null
  if (!isK8s) {
    if (serviceData.defaultBridge === 'default-router') {
      const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
      if (!defaultRouter) {
        throw new Errors.NotFoundError('Default router not found')
      }
      serviceData.serviceEndpoint = defaultRouter.host
      serviceData.servicePort = serviceData.bridgePort
    } else {
      const router = await RouterManager.findOne({ iofogUuid: serviceData.defaultBridge }, transaction)
      if (!router) {
        throw new Errors.NotFoundError('Router not found')
      }
      serviceData.serviceEndpoint = router.host
      serviceData.servicePort = serviceData.bridgePort
    }
  }

  // 7. Create service in database first
  logger.debug('Creating service in database')
  const service = await ServiceManager.create(serviceData, transaction)

  // 8. Start background orchestration
  setImmediate(async () => {
    try {
      // Set tags if provided
      logger.debug('Setting tags (background)')
      if (serviceData.tags && serviceData.tags.length > 0) {
        await _setTags(service, serviceData.tags, transaction)
      }

      // Add TCP connector
      logger.debug('Adding TCP connector (background)')
      await _addTcpConnector(serviceData, transaction)

      // Add TCP listener
      logger.debug('Adding TCP listener (background)')
      await _addTcpListener(serviceData, transaction)

      // Create K8s service if needed
      if ((serviceData.type === 'microservice' || serviceData.type === 'agent' || serviceData.type === 'external') && isK8s) {
        logger.debug('Creating K8s service (background)')
        await _createK8sService(serviceData, transaction)
      }

      // Update provisioning status to ready
      await ServiceManager.update({ id: service.id }, { provisioningStatus: 'ready', provisioningError: null }, transaction)
    } catch (err) {
      logger.error('Background provisioning failed:', err)
      // Update provisioning status to failed and set error message
      await ServiceManager.update({ id: service.id }, { provisioningStatus: 'failed', provisioningError: err.message }, transaction)
    }
  })

  // 9. Return service immediately
  return service
}

// Update service endpoint
async function updateServiceEndpoint (serviceName, serviceData, transaction) {
  // 1. Validate from schemas validator
  await Validator.validate(serviceData, Validator.schemas.serviceUpdate)
  await _validateServiceName(serviceData)

  // 2. Get existing service
  const existingService = await ServiceManager.findOneWithTags({ name: serviceName }, transaction)
  if (!existingService) {
    throw new Errors.NotFoundError(`Service with name ${serviceName} not found`)
  }

  // 3. Check if service type is being changed
  if (serviceData.type && serviceData.type !== existingService.type) {
    throw new Errors.ValidationError('Changing service type is not allowed. Please delete the service and create a new one with the desired type.')
  }

  if (serviceData.defaultBridge && serviceData.defaultBridge !== existingService.defaultBridge) {
    throw new Errors.ValidationError('Changing default bridge is not allowed. Please delete the service and create a new one with the desired default bridge.')
  }

  // 4. Check K8s environment if type is k8s
  const isK8s = await checkKubernetesEnvironment()
  if (existingService.type === 'k8s' && !isK8s) {
    throw new Errors.ValidationError('Kubernetes environment is required for k8s service type')
  }

  if (serviceData.type !== 'k8s' && isK8s) {
    logger.debug('Validating non k8s service type')
    await validateNonK8sType(serviceData)
  }

  // 5. Validate microservice type if needed
  if (existingService.type === 'microservice') {
    await validateMicroserviceType(serviceData, transaction)
  }

  // 6. Validate agent type if needed
  if (existingService.type === 'agent') {
    await validateFogServiceType(serviceData, transaction)
  }

  // 7. Validate default bridge if needed
  if (serviceData.defaultBridge) {
    await validateDefaultBridge(serviceData, transaction)
  }

  serviceData.bridgePort = existingService.bridgePort

  // Set provisioning fields
  serviceData.provisioningStatus = 'pending'
  serviceData.provisioningError = null

  if (!isK8s) {
    if (serviceData.defaultBridge === 'default-router') {
      const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
      if (!defaultRouter) {
        throw new Errors.NotFoundError('Default router not found')
      }
      serviceData.serviceEndpoint = defaultRouter.host
      serviceData.servicePort = serviceData.bridgePort
    } else {
      const router = await RouterManager.findOne({ iofogUuid: serviceData.defaultBridge }, transaction)
      if (!router) {
        throw new Errors.NotFoundError('Router not found')
      }
      serviceData.serviceEndpoint = router.host
      serviceData.servicePort = serviceData.bridgePort
    }
  }

  // 8. Update service in database
  const updatedService = await ServiceManager.update(
    { name: serviceName },
    serviceData,
    transaction
  )

  // 9. Start background orchestration
  setImmediate(async () => {
    try {
      // Update tags if provided
      if (serviceData.tags) {
        await _setTags(existingService, serviceData.tags, transaction)
      }

      // Handle resource changes
      if (serviceData.resource &&
          JSON.stringify(serviceData.resource) !== JSON.stringify(existingService.resource)) {
        await _deleteTcpConnector(serviceName, transaction)
        await _addTcpConnector(serviceData, transaction)
      } else {
        await _updateTcpConnector(serviceData, transaction)
        // await _updateTcpListener(serviceData, transaction)
      }

      // Update K8s service if needed
      if ((existingService.type === 'microservice' || existingService.type === 'agent' || existingService.type === 'external') && isK8s) {
        await _updateK8sService(serviceData, transaction)
      }

      // Update provisioning status to ready
      await ServiceManager.update(
        { name: serviceName },
        { provisioningStatus: 'ready', provisioningError: null },
        transaction
      )
    } catch (err) {
      logger.error('Background provisioning failed (update):', err)
      // Update provisioning status to failed and set error message
      await ServiceManager.update(
        { name: serviceName },
        { provisioningStatus: 'failed', provisioningError: err.message },
        transaction
      )
    }
  })

  // 10. Return updated service immediately
  return updatedService
}

// Delete service endpoint
async function deleteServiceEndpoint (serviceName, transaction) {
  logger.debug('deleteServiceEndpoint: start', { serviceName })
  // Get existing service
  const existingService = await ServiceManager.findOne({ name: serviceName }, transaction)
  if (!existingService) {
    throw new Errors.NotFoundError(`Service with name ${serviceName} not found`)
  }
  logger.debug('deleteServiceEndpoint: existingService', { type: existingService.type, defaultBridge: existingService.defaultBridge })

  const isK8s = await checkKubernetesEnvironment()

  try {
    // Delete TCP connector
    logger.debug('deleteServiceEndpoint: deleting TCP connector')
    await _deleteTcpConnector(serviceName, transaction)
    logger.debug('deleteServiceEndpoint: TCP connector deleted')

    // Delete TCP listener
    logger.debug('deleteServiceEndpoint: deleting TCP listener')
    await _deleteTcpListener(serviceName, transaction)
    logger.debug('deleteServiceEndpoint: TCP listener deleted')

    // Delete K8s service if needed
    if (isK8s && existingService.type !== 'k8s') {
      logger.debug('deleteServiceEndpoint: deleting K8s service')
      await _deleteK8sService(serviceName)
      logger.debug('deleteServiceEndpoint: K8s service deleted')
    }

    // Finally delete the service from database
    logger.debug('deleteServiceEndpoint: deleting service from DB')
    await ServiceManager.delete({ name: serviceName }, transaction)
    logger.debug('deleteServiceEndpoint: done')

    return { message: `Service ${serviceName} deleted successfully` }
  } catch (error) {
    logger.error('deleteServiceEndpoint: error', {
      serviceName,
      message: error.message,
      stack: error.stack,
      constructorName: error.constructor && error.constructor.name
    })

    // Wrap the error in a proper error type if it's not already
    if (!(error instanceof Errors.ValidationError) &&
        !(error instanceof Errors.NotFoundError) &&
        !(error instanceof Errors.TransactionError) &&
        !(error instanceof Errors.DuplicatePropertyError)) {
      throw new Errors.ValidationError(`Failed to delete service: ${error.message}`)
    }
    throw error
  }
}

// List services endpoint
async function getServicesListEndpoint (transaction) {
  const queryFogData = {}
  const services = await ServiceManager.findAllWithTags(queryFogData, transaction)
  return services.map(service => ({
    name: service.name,
    type: service.type,
    resource: service.resource,
    defaultBridge: service.defaultBridge,
    bridgePort: service.bridgePort,
    targetPort: service.targetPort,
    servicePort: service.servicePort,
    k8sType: service.k8sType,
    serviceEndpoint: service.serviceEndpoint,
    tags: _mapTags(service),
    provisioningStatus: service.provisioningStatus,
    provisioningError: service.provisioningError
  }))
}

// Get service endpoint
async function getServiceEndpoint (serviceName, transaction) {
  const queryFogData = { name: serviceName }
  const service = await ServiceManager.findOneWithTags(queryFogData, transaction)
  if (!service) {
    throw new Errors.NotFoundError(`Service with name ${serviceName} not found`)
  }
  return {
    name: service.name,
    type: service.type,
    resource: service.resource,
    defaultBridge: service.defaultBridge,
    bridgePort: service.bridgePort,
    targetPort: service.targetPort,
    servicePort: service.servicePort,
    k8sType: service.k8sType,
    serviceEndpoint: service.serviceEndpoint,
    tags: _mapTags(service),
    provisioningStatus: service.provisioningStatus,
    provisioningError: service.provisioningError
  }
}

async function moveMicroserviceTcpBridgeToNewFog (service, newFogUuid, oldFogUuid, transaction) {
  const listenerName = `${service.name}-listener`
  const connectorName = `${service.name}-connector`

  const oldRouterMicroservice = await _getRouterMicroservice(oldFogUuid, transaction)
  const oldRouterConfig = JSON.parse(oldRouterMicroservice.config || '{}')
  const newRouterMicroservice = await _getRouterMicroservice(newFogUuid, transaction)
  const newRouterConfig = JSON.parse(newRouterMicroservice.config || '{}')

  const connector = oldRouterConfig.bridges.tcpConnectors[connectorName]
  const listener = oldRouterConfig.bridges.tcpListeners[listenerName]

  if (oldRouterConfig.bridges.tcpConnectors[connectorName]) {
    delete oldRouterConfig.bridges.tcpConnectors[connectorName]
  }
  if (oldRouterConfig.bridges.tcpListeners[listenerName]) {
    delete oldRouterConfig.bridges.tcpListeners[listenerName]
  }

  if (!newRouterConfig.bridges) {
    newRouterConfig.bridges = {}
  }
  if (!newRouterConfig.bridges.tcpConnectors) {
    newRouterConfig.bridges.tcpConnectors = {}
  }

  newRouterConfig.bridges.tcpConnectors[connectorName] = connector
  newRouterConfig.bridges.tcpListeners[listenerName] = listener

  await _updateRouterMicroserviceConfig(oldFogUuid, oldRouterConfig, transaction)
  await _updateRouterMicroserviceConfig(newFogUuid, newRouterConfig, transaction)
}

module.exports = {
  checkKubernetesEnvironment,
  validateMicroserviceType: TransactionDecorator.generateTransaction(validateMicroserviceType),
  validateNonK8sType,
  _validateServiceName,
  validateFogServiceType: TransactionDecorator.generateTransaction(validateFogServiceType),
  validateDefaultBridge: TransactionDecorator.generateTransaction(validateDefaultBridge),
  defineBridgePort: TransactionDecorator.generateTransaction(defineBridgePort),
  handleServiceDistribution: TransactionDecorator.generateTransaction(handleServiceDistribution),
  _mapTags,
  _setTags: TransactionDecorator.generateTransaction(_setTags),
  _createK8sService,
  _updateK8sService,
  _deleteK8sService,
  createServiceEndpoint: TransactionDecorator.generateTransaction(createServiceEndpoint),
  updateServiceEndpoint: TransactionDecorator.generateTransaction(updateServiceEndpoint),
  deleteServiceEndpoint: TransactionDecorator.generateTransaction(deleteServiceEndpoint),
  getServicesListEndpoint: TransactionDecorator.generateTransaction(getServicesListEndpoint),
  getServiceEndpoint: TransactionDecorator.generateTransaction(getServiceEndpoint),
  moveMicroserviceTcpBridgeToNewFog: TransactionDecorator.generateTransaction(moveMicroserviceTcpBridgeToNewFog)
}
