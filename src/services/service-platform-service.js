const TransactionDecorator = require('../decorators/transaction-decorator')
const config = require('../config')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')
const ServiceManager = require('../data/managers/service-manager')
const FogPlatformReconcileTaskManager = require('../data/managers/fog-platform-reconcile-task-manager')
const ServicePlatformReconcileTaskManager = require('../data/managers/service-platform-reconcile-task-manager')
const HubRouterConfigLockManager = require('../data/managers/hub-router-config-lock-manager')
const RouterManager = require('../data/managers/router-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const FogManager = require('../data/managers/iofog-manager')
const ChangeTrackingService = require('./change-tracking-service')
const ServicesService = require('./services-service')
const K8sClient = require('../utils/k8s-client')
const {
  ensureSystemApplication,
  getSystemMicroserviceName
} = require('../helpers/system-naming')
const logger = require('../logger')

const K8S_ROUTER_CONFIG_MAP = 'iofog-router'
const HUB_LOCK_POLL_MS = 500

function getControllerUuid () {
  return config.get('app.uuid')
}

function normalizeTags (tags) {
  if (!tags || tags.length === 0) {
    return []
  }
  return tags.map((tag) => (typeof tag === 'string' ? tag : tag.value))
}

function unionTags (tagsA, tagsB) {
  return [...new Set([...normalizeTags(tagsA), ...normalizeTags(tagsB)])]
}

function buildServiceConfigFromRow (service) {
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
    tags: normalizeTags(service.tags)
  }
}

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

async function _updateRouterMicroserviceConfig (fogNodeUuid, routerConfig, transaction) {
  const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
  await MicroserviceManager.update(
    { uuid: routerMicroservice.uuid },
    { config: JSON.stringify(routerConfig) },
    transaction
  )
  await ChangeTrackingService.update(fogNodeUuid, ChangeTrackingService.events.microserviceConfig, transaction)
}

async function _patchK8sRouterConfig (routerConfig) {
  const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
  if (!configMap) {
    throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
  }
  await K8sClient.patchConfigMap(K8S_ROUTER_CONFIG_MAP, {
    data: {
      'skrouterd.json': JSON.stringify(routerConfig)
    }
  })
}

async function _resolveHubListenerFogUuid (serviceConfig, transaction) {
  if (serviceConfig.defaultBridge === 'default-router') {
    const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
    if (!defaultRouter) {
      throw new Errors.NotFoundError('Default router not found')
    }
    return defaultRouter.iofogUuid
  }
  return serviceConfig.defaultBridge
}

async function upsertHubTcpListener (serviceConfig, transaction) {
  const isK8s = await ServicesService.checkKubernetesEnvironment()
  const listener = ServicesService._buildTcpListener(serviceConfig)

  if (isK8s) {
    const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
    if (!configMap) {
      throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
    }
    const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
    const listenerIndex = routerConfig.findIndex((item) =>
      item[0] === 'tcpListener' && item[1].name === listener.name
    )
    if (listenerIndex !== -1) {
      routerConfig[listenerIndex] = ['tcpListener', listener]
    } else {
      routerConfig.push(['tcpListener', listener])
    }
    await _patchK8sRouterConfig(routerConfig)
    return
  }

  const fogNodeUuid = await _resolveHubListenerFogUuid(serviceConfig, transaction)
  const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
  const currentConfig = JSON.parse(routerMicroservice.config || '{}')
  if (!currentConfig.bridges) {
    currentConfig.bridges = {}
  }
  if (!currentConfig.bridges.tcpListeners) {
    currentConfig.bridges.tcpListeners = {}
  }
  currentConfig.bridges.tcpListeners[listener.name] = listener
  await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
}

async function upsertHubTcpConnector (serviceConfig, transaction) {
  const isK8s = await ServicesService.checkKubernetesEnvironment()
  const targetRouterNode = await ServicesService._determineConnectorSiteId(serviceConfig, transaction)
  const connector = await ServicesService._buildTcpConnector(serviceConfig, transaction)

  if (targetRouterNode === 'default-router') {
    if (isK8s) {
      const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
      if (!configMap) {
        throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
      }
      const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
      const connectorIndex = routerConfig.findIndex((item) =>
        item[0] === 'tcpConnector' && item[1].name === connector.name
      )
      if (connectorIndex !== -1) {
        routerConfig[connectorIndex] = ['tcpConnector', connector]
      } else {
        routerConfig.push(['tcpConnector', connector])
      }
      await _patchK8sRouterConfig(routerConfig)
      return
    }

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
    currentConfig.bridges.tcpConnectors[connector.name] = connector
    await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
    return
  }

  const fogNodeUuid = targetRouterNode
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

async function deleteHubTcpConnector (serviceConfig, transaction) {
  const isK8s = await ServicesService.checkKubernetesEnvironment()
  const connectorName = `${serviceConfig.name}-connector`
  const targetRouterNode = await ServicesService._determineConnectorSiteId(serviceConfig, transaction)

  if (targetRouterNode === 'default-router') {
    if (isK8s) {
      const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
      if (!configMap) {
        throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
      }
      const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
      const updatedConfig = routerConfig.filter((item) =>
        !(item[0] === 'tcpConnector' && item[1].name === connectorName)
      )
      await _patchK8sRouterConfig(updatedConfig)
      return
    }

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
    return
  }

  const fogNodeUuid = targetRouterNode
  const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
  const currentConfig = JSON.parse(routerMicroservice.config || '{}')
  if (currentConfig.bridges && currentConfig.bridges.tcpConnectors) {
    delete currentConfig.bridges.tcpConnectors[connectorName]
  }
  await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
}

async function deleteHubTcpListener (serviceConfig, transaction) {
  const isK8s = await ServicesService.checkKubernetesEnvironment()
  const listenerName = `${serviceConfig.name}-listener`

  if (isK8s) {
    const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
    if (!configMap) {
      throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
    }
    const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
    const updatedConfig = routerConfig.filter((item) =>
      !(item[0] === 'tcpListener' && item[1].name === listenerName)
    )
    await _patchK8sRouterConfig(updatedConfig)
    return
  }

  const fogNodeUuid = await _resolveHubListenerFogUuid(serviceConfig, transaction)
  const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
  const currentConfig = JSON.parse(routerMicroservice.config || '{}')
  if (currentConfig.bridges && currentConfig.bridges.tcpListeners) {
    delete currentConfig.bridges.tcpListeners[listenerName]
  }
  await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
}

async function acquireHubLockWithTimeout (controllerUuid, transaction) {
  const timeoutSeconds = config.get('settings.hubRouterConfigLockTimeoutSeconds', 120)
  const deadline = Date.now() + timeoutSeconds * 1000

  while (Date.now() < deadline) {
    const acquired = await HubRouterConfigLockManager.tryAcquire(
      controllerUuid,
      timeoutSeconds,
      transaction
    )
    if (acquired) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, HUB_LOCK_POLL_MS))
  }

  throw new Error(`Timed out waiting for hub router ConfigMap lock after ${timeoutSeconds}s`)
}

async function watchLoadBalancerWithTimeout (serviceName) {
  const timeoutSeconds = config.get('settings.serviceLoadBalancerWatchTimeoutSeconds', 300)
  const retryInterval = 2000
  const maxRetries = Math.max(1, Math.ceil((timeoutSeconds * 1000) / retryInterval))
  const loadBalancerIP = await K8sClient.watchLoadBalancerIP(serviceName, maxRetries, retryInterval)
  if (!loadBalancerIP) {
    throw new Error(
      `LoadBalancer IP not assigned for service ${serviceName} within ${timeoutSeconds}s`
    )
  }
  return loadBalancerIP
}

function needsK8sService (serviceConfig, isK8s) {
  if (!isK8s) {
    return false
  }
  const serviceType = (serviceConfig.type || '').toLowerCase()
  return serviceType === 'microservice' ||
    serviceType === 'agent' ||
    serviceType === 'external'
}

async function reconcileK8sService (serviceConfig, isK8s, transaction) {
  if (!needsK8sService(serviceConfig, isK8s)) {
    return
  }

  await ServicesService._updateK8sService(serviceConfig, transaction)

  if ((serviceConfig.k8sType || '').toLowerCase() === 'loadbalancer') {
    const loadBalancerIP = await watchLoadBalancerWithTimeout(serviceConfig.name)
    await ServiceManager.update(
      { name: serviceConfig.name },
      { serviceEndpoint: loadBalancerIP },
      transaction
    )
  }
}

async function fanOutFogReconcile (serviceTags, transaction) {
  const fogUuids = await ServicesService.handleServiceDistribution(serviceTags, transaction)
  for (const fogUuid of fogUuids) {
    await FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask({
      fogUuid,
      reason: 'service-changed'
    }, transaction)
  }
  return fogUuids
}

async function reconcileServiceHub (serviceConfig, snapshot, transaction) {
  if (snapshot &&
      snapshot.resource != null &&
      serviceConfig.resource != null &&
      snapshot.resource !== serviceConfig.resource) {
    await deleteHubTcpConnector(buildServiceConfigFromRow(snapshot), transaction)
  }

  await upsertHubTcpConnector(serviceConfig, transaction)
  await upsertHubTcpListener(serviceConfig, transaction)
}

async function reconcileServiceDeleteHub (serviceConfig, isK8s, transaction) {
  await deleteHubTcpConnector(serviceConfig, transaction)
  await deleteHubTcpListener(serviceConfig, transaction)

  if (isK8s && (serviceConfig.type || '').toLowerCase() !== 'k8s') {
    await ServicesService._deleteK8sService(serviceConfig.name)
  }
}

async function reconcileService (serviceName, task, transaction) {
  const startedAt = Date.now()
  const isDelete = task && task.reason === 'delete'
  const snapshot = task ? ServicePlatformReconcileTaskManager.getParsedSpecSnapshot(task) : null
  const controllerUuid = getControllerUuid()
  let hubLockHeld = false

  try {
    let serviceConfig = null
    let fanOutTags = []

    if (isDelete) {
      if (!snapshot) {
        throw new Errors.ValidationError(`Service delete reconcile requires spec_snapshot for ${serviceName}`)
      }
      serviceConfig = buildServiceConfigFromRow(snapshot)
      fanOutTags = normalizeTags(snapshot.tags)
    } else {
      const service = await ServiceManager.findOneWithTags({ name: serviceName }, transaction)
      if (!service) {
        throw new Errors.NotFoundError(`Service with name ${serviceName} not found`)
      }
      serviceConfig = buildServiceConfigFromRow(service)
      fanOutTags = unionTags(snapshot && snapshot.tags, serviceConfig.tags)

      await ServiceManager.update(
        { name: serviceName },
        { provisioningStatus: 'pending', provisioningError: null },
        transaction
      )
    }

    const isK8s = await ServicesService.checkKubernetesEnvironment()

    if (isK8s) {
      await acquireHubLockWithTimeout(controllerUuid, transaction)
      hubLockHeld = true
    }

    if (isDelete) {
      await reconcileServiceDeleteHub(serviceConfig, isK8s, transaction)
    } else {
      await reconcileServiceHub(serviceConfig, snapshot, transaction)
      await reconcileK8sService(serviceConfig, isK8s, transaction)
    }

    if (hubLockHeld) {
      await HubRouterConfigLockManager.release(controllerUuid, transaction)
      hubLockHeld = false
    }

    await fanOutFogReconcile(fanOutTags, transaction)

    if (!isDelete) {
      await ServiceManager.update(
        { name: serviceName },
        { provisioningStatus: 'ready', provisioningError: null },
        transaction
      )
    } else if (task && task.id != null) {
      await ServicePlatformReconcileTaskManager.delete({ id: task.id }, transaction)
    }

    logger.info('servicePlatformReconcile completed', {
      serviceName,
      reason: task ? task.reason : null,
      isDelete,
      durationMs: Date.now() - startedAt
    })

    return {
      serviceName,
      isDelete,
      provisioningStatus: isDelete ? null : 'ready'
    }
  } catch (error) {
    if (hubLockHeld) {
      try {
        await HubRouterConfigLockManager.release(controllerUuid, transaction)
      } catch (releaseError) {
        logger.warn('servicePlatformReconcile failed to release hub lock', {
          serviceName,
          error: releaseError.message
        })
      }
    }

    logger.error('servicePlatformReconcile failed', {
      serviceName,
      reason: task ? task.reason : null,
      durationMs: Date.now() - startedAt,
      error: error.message
    })
    throw error
  }
}

const bypassOptions = { bypassQueue: true }

module.exports = {
  normalizeTags,
  unionTags,
  buildServiceConfigFromRow,
  upsertHubTcpListener,
  upsertHubTcpConnector,
  deleteHubTcpConnector,
  deleteHubTcpListener,
  acquireHubLockWithTimeout,
  watchLoadBalancerWithTimeout,
  fanOutFogReconcile,
  reconcileService: TransactionDecorator.generateTransaction(reconcileService, bypassOptions)
}
