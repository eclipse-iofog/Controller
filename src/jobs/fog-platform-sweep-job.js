const { Op } = require('sequelize')
const ClusterControllerService = require('../services/cluster-controller-service')
const FogPlatformSpecManager = require('../data/managers/fog-platform-spec-manager')
const FogPlatformStatusManager = require('../data/managers/fog-platform-status-manager')
const FogPlatformReconcileTaskManager = require('../data/managers/fog-platform-reconcile-task-manager')
const ServicePlatformReconcileTaskManager = require('../data/managers/service-platform-reconcile-task-manager')
const FogManager = require('../data/managers/iofog-manager')
const ServiceManager = require('../data/managers/service-manager')
const RouterManager = require('../data/managers/router-manager')
const NatsInstanceManager = require('../data/managers/nats-instance-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const IofogService = require('../services/iofog-service')
const ServicesService = require('../services/services-service')
const K8sClient = require('../utils/k8s-client')
const databaseProvider = require('../data/providers/database-factory')
const Config = require('../config')
const logger = require('../logger')

const ACTIVE_STATUSES = ['pending', 'in_progress']
const K8S_ROUTER_CONFIG_MAP = 'iofog-router'

const scheduleTime = Config.get('settings.fogPlatformSweepIntervalSeconds', 900) * 1000

async function run () {
  try {
    await runSweepInternal()
  } catch (error) {
    logger.error('Fog platform sweep error:', error)
  } finally {
    setTimeout(run, scheduleTime)
  }
}

async function runSweepInternal (transaction) {
  const uuid = ClusterControllerService.getCurrentControllerUuid()
  if (!uuid) {
    return { fogEnqueued: 0, serviceEnqueued: 0 }
  }

  const execute = async (t) => {
    let fogEnqueued = 0
    let serviceEnqueued = 0

    const specs = await FogPlatformSpecManager.findAll({}, t)
    for (const specRow of specs) {
      const shouldEnqueue = await shouldEnqueueFogSweepInternal(specRow.fogUuid, t)
      if (!shouldEnqueue) {
        continue
      }

      const parsedSpec = await FogPlatformSpecManager.getParsedSpec(specRow.fogUuid, t)
      await FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask({
        fogUuid: specRow.fogUuid,
        reason: 'periodic-sweep',
        specGeneration: parsedSpec ? parsedSpec.generation : specRow.generation
      }, t)
      fogEnqueued += 1
    }

    const services = await ServiceManager.findAllWithTags({}, t)
    for (const service of services) {
      const shouldEnqueue = await shouldEnqueueServiceSweepInternal(service, t)
      if (!shouldEnqueue) {
        continue
      }

      const specSnapshot = {
        name: service.name,
        type: service.type,
        resource: service.resource,
        defaultBridge: service.defaultBridge,
        bridgePort: service.bridgePort,
        targetPort: service.targetPort,
        servicePort: service.servicePort,
        k8sType: service.k8sType,
        serviceEndpoint: service.serviceEndpoint,
        tags: (service.tags || []).map((tag) => (typeof tag === 'string' ? tag : tag.value))
      }
      await ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask({
        serviceName: service.name,
        reason: 'periodic-sweep',
        specSnapshot
      }, t)
      serviceEnqueued += 1
    }

    if (fogEnqueued > 0 || serviceEnqueued > 0) {
      logger.info('Fog platform sweep enqueued reconcile tasks', { fogEnqueued, serviceEnqueued })
    }

    return { fogEnqueued, serviceEnqueued }
  }

  if (transaction) {
    return execute(transaction)
  }

  return databaseProvider.sequelize.transaction((t) => execute(t))
}

async function hasActiveFogTask (fogUuid, transaction) {
  const task = await FogPlatformReconcileTaskManager.getEntity().findOne({
    where: {
      fogUuid,
      status: { [Op.in]: ACTIVE_STATUSES }
    },
    transaction
  })
  return !!task
}

async function hasActiveServiceTask (serviceName, transaction) {
  const task = await ServicePlatformReconcileTaskManager.getEntity().findOne({
    where: {
      serviceName,
      status: { [Op.in]: ACTIVE_STATUSES }
    },
    transaction
  })
  return !!task
}

function isBackoffElapsed (nextAttemptAt) {
  if (!nextAttemptAt) {
    return true
  }
  return new Date(nextAttemptAt).getTime() <= Date.now()
}

async function hasRuntimeMissing (fogUuid, parsedSpec, transaction) {
  const spec = parsedSpec.spec
  if (spec.routerMode !== 'none') {
    const router = await RouterManager.findOne({ iofogUuid: fogUuid }, transaction)
    if (!router) {
      return true
    }
  }
  if (spec.natsMode !== 'none') {
    const nats = await NatsInstanceManager.findByFog(fogUuid, transaction)
    if (!nats) {
      return true
    }
  }
  return false
}

async function hasModeMismatch (fogUuid, parsedSpec, transaction) {
  const spec = parsedSpec.spec
  const router = await RouterManager.findOne({ iofogUuid: fogUuid }, transaction)

  if (spec.routerMode !== 'none') {
    if (!router) {
      return false
    }
    const runtimeMode = router.isEdge ? 'edge' : 'interior'
    if (spec.routerMode !== runtimeMode) {
      return true
    }
  } else if (router) {
    return true
  }

  const nats = await NatsInstanceManager.findByFog(fogUuid, transaction)
  if (spec.natsMode !== 'none') {
    if (!nats) {
      return false
    }
    const runtimeNatsMode = nats.isLeaf ? 'leaf' : 'server'
    if (spec.natsMode !== runtimeNatsMode) {
      return true
    }
  } else if (nats) {
    return true
  }

  return false
}

async function hasMissingServiceBridges (fogUuid, parsedSpec, transaction) {
  if (parsedSpec.spec.routerMode === 'none') {
    return false
  }

  const fog = await FogManager.findOneWithTags({ uuid: fogUuid }, transaction)
  if (!fog) {
    return false
  }

  const tagValues = fog.tags ? fog.tags.map((tag) => tag.value) : []
  const serviceTags = await IofogService._extractServiceTags(tagValues)
  if (serviceTags.length === 0) {
    return false
  }

  const services = await IofogService._findMatchingServices(serviceTags, transaction)
  if (services.length === 0) {
    return false
  }

  let routerConfig
  try {
    routerConfig = await IofogService._getRouterMicroserviceConfig(fogUuid, transaction)
  } catch (error) {
    return false
  }

  const listeners = routerConfig?.bridges?.tcpListeners || {}
  for (const service of services) {
    const listener = IofogService._buildTcpListenerForFog(service)
    if (!listeners[listener.name]) {
      return true
    }
  }

  return false
}

async function hasServiceHubDrift (service, transaction) {
  if (service.provisioningStatus !== 'ready') {
    return false
  }

  const listenerName = `${service.name}-listener`
  const isK8s = await ServicesService.checkKubernetesEnvironment()

  if (isK8s) {
    const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
    if (!configMap || !configMap.data || !configMap.data['skrouterd.json']) {
      return true
    }
    const routerConfig = JSON.parse(configMap.data['skrouterd.json'])
    return !routerConfig.some((entry) =>
      entry[0] === 'tcpListener' && entry[1] && entry[1].name === listenerName
    )
  }

  try {
    const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
    if (!defaultRouter) {
      return false
    }
    const routerConfig = await IofogService._getRouterMicroserviceConfig(defaultRouter.iofogUuid, transaction)
    const listeners = routerConfig?.bridges?.tcpListeners || {}
    return !listeners[listenerName]
  } catch (error) {
    return false
  }
}

async function shouldEnqueueFogSweepInternal (fogUuid, transaction) {
  const parsedSpec = await FogPlatformSpecManager.getParsedSpec(fogUuid, transaction)
  if (!parsedSpec) {
    return false
  }

  const status = await FogPlatformStatusManager.getParsedStatus(fogUuid, transaction)
  if (status && status.phase === 'Deleting') {
    return false
  }

  if (!status || status.observedGeneration < parsedSpec.generation) {
    return !(await hasActiveFogTask(fogUuid, transaction))
  }

  if (status.phase === 'Failed' && !(await hasActiveFogTask(fogUuid, transaction))) {
    return true
  }

  if (await hasRuntimeMissing(fogUuid, parsedSpec, transaction)) {
    return !(await hasActiveFogTask(fogUuid, transaction))
  }

  if (await hasModeMismatch(fogUuid, parsedSpec, transaction)) {
    return !(await hasActiveFogTask(fogUuid, transaction))
  }

  if (await hasMissingServiceBridges(fogUuid, parsedSpec, transaction)) {
    return !(await hasActiveFogTask(fogUuid, transaction))
  }

  return false
}

async function shouldEnqueueServiceSweepInternal (service, transaction) {
  if (service.provisioningStatus === 'failed') {
    if (await hasActiveServiceTask(service.name, transaction)) {
      const task = await ServicePlatformReconcileTaskManager.getEntity().findOne({
        where: {
          serviceName: service.name,
          status: { [Op.in]: ACTIVE_STATUSES }
        },
        transaction
      })
      return task ? isBackoffElapsed(task.nextAttemptAt) : false
    }
    return true
  }

  if (await hasServiceHubDrift(service, transaction)) {
    return !(await hasActiveServiceTask(service.name, transaction))
  }

  return false
}

module.exports = {
  run,
  runSweep: TransactionDecorator.generateTransaction(runSweepInternal),
  shouldEnqueueFogSweep: TransactionDecorator.generateTransaction(shouldEnqueueFogSweepInternal),
  shouldEnqueueServiceSweep: TransactionDecorator.generateTransaction(shouldEnqueueServiceSweepInternal)
}
