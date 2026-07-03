const config = require('../config')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')
const ServiceManager = require('../data/managers/service-manager')
const ReconcileOutboxManager = require('../data/managers/reconcile-outbox-manager')
const ServicePlatformReconcileTaskManager = require('../data/managers/service-platform-reconcile-task-manager')
const HubRouterConfigLockManager = require('../data/managers/hub-router-config-lock-manager')
const RouterManager = require('../data/managers/router-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const FogManager = require('../data/managers/iofog-manager')
const ChangeTrackingService = require('./change-tracking-service')
const ServicesService = require('./services-service')
const K8sClient = require('../utils/k8s-client')
const { runInTransaction, PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')
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

function emptyK8sHubRouterPlan () {
  return {
    upsertListeners: [],
    upsertConnectors: [],
    deleteListenerNames: [],
    deleteConnectorNames: []
  }
}

function mergeK8sHubRouterPlans (...plans) {
  const merged = emptyK8sHubRouterPlan()
  for (const plan of plans) {
    if (!plan) {
      continue
    }
    merged.upsertListeners.push(...plan.upsertListeners)
    merged.upsertConnectors.push(...plan.upsertConnectors)
    merged.deleteListenerNames.push(...plan.deleteListenerNames)
    merged.deleteConnectorNames.push(...plan.deleteConnectorNames)
  }
  return merged
}

function applyK8sHubRouterPlanToConfig (routerConfig, plan) {
  let updatedConfig = routerConfig

  for (const connectorName of plan.deleteConnectorNames) {
    updatedConfig = updatedConfig.filter((item) =>
      !(item[0] === 'tcpConnector' && item[1].name === connectorName)
    )
  }
  for (const listenerName of plan.deleteListenerNames) {
    updatedConfig = updatedConfig.filter((item) =>
      !(item[0] === 'tcpListener' && item[1].name === listenerName)
    )
  }
  for (const connector of plan.upsertConnectors) {
    const connectorIndex = updatedConfig.findIndex((item) =>
      item[0] === 'tcpConnector' && item[1].name === connector.name
    )
    if (connectorIndex !== -1) {
      updatedConfig[connectorIndex] = ['tcpConnector', connector]
    } else {
      updatedConfig.push(['tcpConnector', connector])
    }
  }
  for (const listener of plan.upsertListeners) {
    const listenerIndex = updatedConfig.findIndex((item) =>
      item[0] === 'tcpListener' && item[1].name === listener.name
    )
    if (listenerIndex !== -1) {
      updatedConfig[listenerIndex] = ['tcpListener', listener]
    } else {
      updatedConfig.push(['tcpListener', listener])
    }
  }

  return updatedConfig
}

async function applyK8sHubRouterPlan (plan) {
  const hasChanges = plan.upsertListeners.length > 0 ||
    plan.upsertConnectors.length > 0 ||
    plan.deleteListenerNames.length > 0 ||
    plan.deleteConnectorNames.length > 0
  if (!hasChanges) {
    return
  }

  const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
  if (!configMap) {
    throw new Errors.NotFoundError(`ConfigMap not found: ${K8S_ROUTER_CONFIG_MAP}`)
  }
  const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
  const updatedConfig = applyK8sHubRouterPlanToConfig(routerConfig, plan)
  await _patchK8sRouterConfig(updatedConfig)
}

async function upsertHubTcpListenerDb (serviceConfig, transaction) {
  const listener = ServicesService._buildTcpListener(serviceConfig)
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

async function upsertHubTcpConnectorDb (serviceConfig, transaction) {
  const targetRouterNode = await ServicesService._determineConnectorSiteId(serviceConfig, transaction)
  const connector = await ServicesService._buildTcpConnector(serviceConfig, transaction)

  if (targetRouterNode === 'default-router') {
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

async function deleteHubTcpConnectorDb (serviceConfig, transaction) {
  const connectorName = `${serviceConfig.name}-connector`
  const targetRouterNode = await ServicesService._determineConnectorSiteId(serviceConfig, transaction)

  if (targetRouterNode === 'default-router') {
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

async function deleteHubTcpListenerDb (serviceConfig, transaction) {
  const listenerName = `${serviceConfig.name}-listener`
  const fogNodeUuid = await _resolveHubListenerFogUuid(serviceConfig, transaction)
  const routerMicroservice = await _getRouterMicroservice(fogNodeUuid, transaction)
  const currentConfig = JSON.parse(routerMicroservice.config || '{}')
  if (currentConfig.bridges && currentConfig.bridges.tcpListeners) {
    delete currentConfig.bridges.tcpListeners[listenerName]
  }
  await _updateRouterMicroserviceConfig(fogNodeUuid, currentConfig, transaction)
}

async function planHubTcpConnectorUpsert (serviceConfig, transaction) {
  const targetRouterNode = await ServicesService._determineConnectorSiteId(serviceConfig, transaction)
  const connector = await ServicesService._buildTcpConnector(serviceConfig, transaction)

  if (targetRouterNode === 'default-router') {
    return {
      ...emptyK8sHubRouterPlan(),
      upsertConnectors: [connector]
    }
  }

  await upsertHubTcpConnectorDb(serviceConfig, transaction)
  return emptyK8sHubRouterPlan()
}

async function planHubTcpConnectorDelete (serviceConfig, transaction) {
  const connectorName = `${serviceConfig.name}-connector`
  const targetRouterNode = await ServicesService._determineConnectorSiteId(serviceConfig, transaction)

  if (targetRouterNode === 'default-router') {
    return {
      ...emptyK8sHubRouterPlan(),
      deleteConnectorNames: [connectorName]
    }
  }

  await deleteHubTcpConnectorDb(serviceConfig, transaction)
  return emptyK8sHubRouterPlan()
}

async function planHubTcpListenerUpsert (serviceConfig) {
  const listener = ServicesService._buildTcpListener(serviceConfig)
  return {
    ...emptyK8sHubRouterPlan(),
    upsertListeners: [listener]
  }
}

async function planHubTcpListenerDelete (serviceConfig) {
  return {
    ...emptyK8sHubRouterPlan(),
    deleteListenerNames: [`${serviceConfig.name}-listener`]
  }
}

async function upsertHubTcpListener (serviceConfig, transaction) {
  const isK8s = await ServicesService.checkKubernetesEnvironment()

  if (isK8s) {
    const plan = await planHubTcpListenerUpsert(serviceConfig)
    await applyK8sHubRouterPlan(plan)
    return
  }

  await upsertHubTcpListenerDb(serviceConfig, transaction)
}

async function upsertHubTcpConnector (serviceConfig, transaction) {
  const isK8s = await ServicesService.checkKubernetesEnvironment()

  if (isK8s) {
    const plan = await planHubTcpConnectorUpsert(serviceConfig, transaction)
    await applyK8sHubRouterPlan(plan)
    return
  }

  await upsertHubTcpConnectorDb(serviceConfig, transaction)
}

async function deleteHubTcpConnector (serviceConfig, transaction) {
  const isK8s = await ServicesService.checkKubernetesEnvironment()

  if (isK8s) {
    const plan = await planHubTcpConnectorDelete(serviceConfig, transaction)
    await applyK8sHubRouterPlan(plan)
    return
  }

  await deleteHubTcpConnectorDb(serviceConfig, transaction)
}

async function deleteHubTcpListener (serviceConfig, transaction) {
  const isK8s = await ServicesService.checkKubernetesEnvironment()

  if (isK8s) {
    const plan = await planHubTcpListenerDelete(serviceConfig)
    await applyK8sHubRouterPlan(plan)
    return
  }

  await deleteHubTcpListenerDb(serviceConfig, transaction)
}

async function acquireHubLockWithTimeout (controllerUuid) {
  const timeoutSeconds = config.get('settings.hubRouterConfigLockTimeoutSeconds', 120)
  const deadline = Date.now() + timeoutSeconds * 1000

  while (Date.now() < deadline) {
    const acquired = await runInTransaction(
      (transaction) => HubRouterConfigLockManager.tryAcquire(
        controllerUuid,
        timeoutSeconds,
        transaction
      ),
      { priority: PRIORITY_BACKGROUND, label: 'servicePlatform.hubLockAcquire' }
    )
    if (acquired) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, HUB_LOCK_POLL_MS))
  }

  throw new Error(`Timed out waiting for hub router ConfigMap lock after ${timeoutSeconds}s`)
}

async function releaseHubLock (controllerUuid) {
  await runInTransaction(
    (transaction) => HubRouterConfigLockManager.release(controllerUuid, transaction),
    { priority: PRIORITY_BACKGROUND, label: 'servicePlatform.hubLockRelease' }
  )
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

async function reconcileK8sServiceExternal (serviceConfig, isK8s) {
  if (!needsK8sService(serviceConfig, isK8s)) {
    return
  }

  const loadBalancerIP = await ServicesService._syncK8sServiceResource(serviceConfig)

  if ((serviceConfig.k8sType || '').toLowerCase() === 'loadbalancer' && !loadBalancerIP) {
    const timeoutSeconds = config.get('settings.serviceLoadBalancerWatchTimeoutSeconds', 300)
    throw new Error(
      `LoadBalancer IP not assigned for service ${serviceConfig.name} within ${timeoutSeconds}s`
    )
  }

  if (loadBalancerIP) {
    await runInTransaction(
      (transaction) => ServiceManager.update(
        { name: serviceConfig.name },
        { serviceEndpoint: loadBalancerIP },
        transaction
      ),
      { priority: PRIORITY_BACKGROUND, label: 'servicePlatform.k8sLoadBalancerEndpoint' }
    )
  }
}

async function fanOutFogReconcile (serviceTags, transaction) {
  const fogUuids = await ServicesService.handleServiceDistribution(serviceTags, transaction)
  for (const fogUuid of fogUuids) {
    await ReconcileOutboxManager.enqueueFogPlatform({
      fogUuid,
      reason: 'service-changed'
    }, transaction)
  }
  return fogUuids
}

async function reconcileServiceHub (serviceConfig, snapshot, transaction) {
  const plans = []

  if (snapshot &&
      snapshot.resource != null &&
      serviceConfig.resource != null &&
      snapshot.resource !== serviceConfig.resource) {
    plans.push(await planHubTcpConnectorDelete(buildServiceConfigFromRow(snapshot), transaction))
  }

  plans.push(await planHubTcpConnectorUpsert(serviceConfig, transaction))
  plans.push(await planHubTcpListenerUpsert(serviceConfig))

  return mergeK8sHubRouterPlans(...plans)
}

async function reconcileServiceDeleteHub (serviceConfig, transaction) {
  const plans = [
    await planHubTcpConnectorDelete(serviceConfig, transaction),
    await planHubTcpListenerDelete(serviceConfig)
  ]
  return mergeK8sHubRouterPlans(...plans)
}

async function reconcileServiceHubDb (serviceConfig, snapshot, transaction) {
  if (snapshot &&
      snapshot.resource != null &&
      serviceConfig.resource != null &&
      snapshot.resource !== serviceConfig.resource) {
    await deleteHubTcpConnectorDb(buildServiceConfigFromRow(snapshot), transaction)
  }

  await upsertHubTcpConnectorDb(serviceConfig, transaction)
  await upsertHubTcpListenerDb(serviceConfig, transaction)
}

async function reconcileServiceDeleteHubDb (serviceConfig, transaction) {
  await deleteHubTcpConnectorDb(serviceConfig, transaction)
  await deleteHubTcpListenerDb(serviceConfig, transaction)
}

async function reconcileService (serviceName, task) {
  const startedAt = Date.now()
  const isDelete = task && task.reason === 'delete'
  const snapshot = task ? ServicePlatformReconcileTaskManager.getParsedSpecSnapshot(task) : null
  const controllerUuid = getControllerUuid()

  const prep = await runInTransaction(async (transaction) => {
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

    return { serviceConfig, fanOutTags }
  }, { priority: PRIORITY_BACKGROUND, label: 'servicePlatform.prepare' })

  const isK8s = await ServicesService.checkKubernetesEnvironment()

  try {
    if (isK8s) {
      await acquireHubLockWithTimeout(controllerUuid)
      try {
        const hubPlan = await runInTransaction(async (transaction) => {
          if (isDelete) {
            return reconcileServiceDeleteHub(prep.serviceConfig, transaction)
          }
          return reconcileServiceHub(prep.serviceConfig, snapshot, transaction)
        }, { priority: PRIORITY_BACKGROUND, label: 'servicePlatform.hubReconcile' })

        await applyK8sHubRouterPlan(hubPlan)

        if (isDelete) {
          if ((prep.serviceConfig.type || '').toLowerCase() !== 'k8s') {
            await ServicesService._deleteK8sService(prep.serviceConfig.name)
          }
        } else {
          await reconcileK8sServiceExternal(prep.serviceConfig, isK8s)
        }
      } finally {
        await releaseHubLock(controllerUuid)
      }
    } else {
      await runInTransaction(async (transaction) => {
        if (isDelete) {
          await reconcileServiceDeleteHubDb(prep.serviceConfig, transaction)
        } else {
          await reconcileServiceHubDb(prep.serviceConfig, snapshot, transaction)
        }
      }, { priority: PRIORITY_BACKGROUND, label: 'servicePlatform.hubDb' })
    }

    await runInTransaction(async (transaction) => {
      await fanOutFogReconcile(prep.fanOutTags, transaction)

      if (!isDelete) {
        await ServiceManager.update(
          { name: serviceName },
          { provisioningStatus: 'ready', provisioningError: null },
          transaction
        )
      } else if (task && task.id != null) {
        await ServicePlatformReconcileTaskManager.delete({ id: task.id }, transaction)
      }
    }, { priority: PRIORITY_BACKGROUND, label: 'servicePlatform.finalize' })

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
    logger.error('servicePlatformReconcile failed', {
      serviceName,
      reason: task ? task.reason : null,
      durationMs: Date.now() - startedAt,
      error: error.message
    })
    throw error
  }
}

module.exports = {
  normalizeTags,
  unionTags,
  buildServiceConfigFromRow,
  upsertHubTcpListener,
  upsertHubTcpConnector,
  deleteHubTcpConnector,
  deleteHubTcpListener,
  acquireHubLockWithTimeout,
  releaseHubLock,
  watchLoadBalancerWithTimeout,
  fanOutFogReconcile,
  applyK8sHubRouterPlan,
  applyK8sHubRouterPlanToConfig,
  reconcileService
}
