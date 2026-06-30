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
const { runInTransaction, PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')
const IofogService = require('../services/iofog-service')
const ServicesService = require('../services/services-service')
const K8sClient = require('../utils/k8s-client')
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

async function fetchK8sRouterConfig () {
  const configMap = await K8sClient.getConfigMap(K8S_ROUTER_CONFIG_MAP)
  if (!configMap || !configMap.data || !configMap.data['skrouterd.json']) {
    return null
  }
  return JSON.parse(configMap.data['skrouterd.json'])
}

function hasK8sServiceHubDrift (service, k8sRouterConfig) {
  const listenerName = `${service.name}-listener`
  if (!k8sRouterConfig) {
    return true
  }
  return !k8sRouterConfig.some((entry) =>
    entry[0] === 'tcpListener' && entry[1] && entry[1].name === listenerName
  )
}

function hasNonK8sServiceHubDrift (service, defaultRouterConfig) {
  if (!defaultRouterConfig) {
    return false
  }
  const listenerName = `${service.name}-listener`
  const listeners = defaultRouterConfig.bridges?.tcpListeners || {}
  return !listeners[listenerName]
}

async function evaluateSweepCandidates (transaction) {
  const fogCandidates = []
  const failedServiceCandidates = []
  const readyServicesForDrift = []
  let needsK8sDriftCheck = false
  let defaultRouterConfig = null

  const specs = await FogPlatformSpecManager.findAll({}, transaction)
  for (const specRow of specs) {
    if (!(await shouldEnqueueFogSweepInternal(specRow.fogUuid, transaction))) {
      continue
    }
    const parsedSpec = await FogPlatformSpecManager.getParsedSpec(specRow.fogUuid, transaction)
    fogCandidates.push({
      fogUuid: specRow.fogUuid,
      specGeneration: parsedSpec ? parsedSpec.generation : specRow.generation
    })
  }

  const services = await ServiceManager.findAllWithTags({}, transaction)
  for (const service of services) {
    if (service.provisioningStatus === 'failed') {
      if (await shouldEnqueueFailedServiceSweep(service, transaction)) {
        failedServiceCandidates.push(service)
      }
      continue
    }

    if (service.provisioningStatus === 'ready') {
      readyServicesForDrift.push(service)
    }
  }

  if (readyServicesForDrift.length > 0) {
    const isK8s = await ServicesService.checkKubernetesEnvironment()
    if (isK8s) {
      needsK8sDriftCheck = true
    } else {
      try {
        const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
        if (defaultRouter) {
          defaultRouterConfig = await IofogService._getRouterMicroserviceConfig(defaultRouter.iofogUuid, transaction)
        }
      } catch (error) {
        defaultRouterConfig = null
      }
    }
  }

  return {
    fogCandidates,
    failedServiceCandidates,
    readyServicesForDrift,
    needsK8sDriftCheck,
    defaultRouterConfig
  }
}

async function persistSweepEnqueue (evaluation, k8sRouterConfig, isK8s, transaction) {
  let fogEnqueued = 0
  let serviceEnqueued = 0

  for (const candidate of evaluation.fogCandidates) {
    await FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask({
      fogUuid: candidate.fogUuid,
      reason: 'periodic-sweep',
      specGeneration: candidate.specGeneration
    }, transaction)
    fogEnqueued += 1
  }

  for (const service of evaluation.failedServiceCandidates) {
    await enqueueServiceSweepTask(service, transaction)
    serviceEnqueued += 1
  }

  for (const service of evaluation.readyServicesForDrift) {
    const hasDrift = isK8s
      ? hasK8sServiceHubDrift(service, k8sRouterConfig)
      : hasNonK8sServiceHubDrift(service, evaluation.defaultRouterConfig)

    if (!hasDrift || await hasActiveServiceTask(service.name, transaction)) {
      continue
    }

    await enqueueServiceSweepTask(service, transaction)
    serviceEnqueued += 1
  }

  if (fogEnqueued > 0 || serviceEnqueued > 0) {
    logger.info('Fog platform sweep enqueued reconcile tasks', { fogEnqueued, serviceEnqueued })
  }

  return { fogEnqueued, serviceEnqueued }
}

function buildServiceSpecSnapshot (service) {
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
    tags: (service.tags || []).map((tag) => (typeof tag === 'string' ? tag : tag.value))
  }
}

async function enqueueServiceSweepTask (service, transaction) {
  await ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask({
    serviceName: service.name,
    reason: 'periodic-sweep',
    specSnapshot: buildServiceSpecSnapshot(service)
  }, transaction)
}

async function runSweepInternal (transaction) {
  const uuid = ClusterControllerService.getCurrentControllerUuid()
  if (!uuid) {
    return { fogEnqueued: 0, serviceEnqueued: 0 }
  }

  const evaluate = (t) => evaluateSweepCandidates(t)
  const evaluation = transaction
    ? await evaluate(transaction)
    : await runInTransaction(evaluate, { priority: PRIORITY_BACKGROUND, label: 'fogPlatformSweep.evaluate' })

  let k8sRouterConfig = null
  const isK8s = evaluation.needsK8sDriftCheck
    ? await ServicesService.checkKubernetesEnvironment()
    : false

  if (evaluation.needsK8sDriftCheck && isK8s) {
    try {
      k8sRouterConfig = await fetchK8sRouterConfig()
    } catch (error) {
      logger.warn('Fog platform sweep K8s config fetch failed', { err: error })
    }
  }

  const persist = (t) => persistSweepEnqueue(evaluation, k8sRouterConfig, isK8s, t)
  if (transaction) {
    return persist(transaction)
  }

  return runInTransaction(persist, { priority: PRIORITY_BACKGROUND, label: 'fogPlatformSweep.persist' })
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

async function shouldEnqueueFailedServiceSweep (service, transaction) {
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

async function hasServiceHubDrift (service, transaction, options = {}) {
  if (service.provisioningStatus !== 'ready') {
    return false
  }

  const isK8s = options.isK8s != null
    ? options.isK8s
    : await ServicesService.checkKubernetesEnvironment()

  if (isK8s) {
    const k8sRouterConfig = options.k8sRouterConfig !== undefined
      ? options.k8sRouterConfig
      : await fetchK8sRouterConfig()
    return hasK8sServiceHubDrift(service, k8sRouterConfig)
  }

  try {
    const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
    if (!defaultRouter) {
      return false
    }
    const routerConfig = options.defaultRouterConfig !== undefined
      ? options.defaultRouterConfig
      : await IofogService._getRouterMicroserviceConfig(defaultRouter.iofogUuid, transaction)
    return hasNonK8sServiceHubDrift(service, routerConfig)
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

async function shouldEnqueueServiceSweepInternal (service, transaction, options = {}) {
  if (service.provisioningStatus === 'failed') {
    return shouldEnqueueFailedServiceSweep(service, transaction)
  }

  if (await hasServiceHubDrift(service, transaction, options)) {
    return !(await hasActiveServiceTask(service.name, transaction))
  }

  return false
}

module.exports = {
  run,
  runSweep: TransactionDecorator.generateTransaction(runSweepInternal, { priority: PRIORITY_BACKGROUND, label: 'fogPlatformSweep' }),
  shouldEnqueueFogSweep: TransactionDecorator.generateTransaction(shouldEnqueueFogSweepInternal),
  shouldEnqueueServiceSweep: TransactionDecorator.generateTransaction(shouldEnqueueServiceSweepInternal),
  fetchK8sRouterConfig,
  hasK8sServiceHubDrift,
  hasNonK8sServiceHubDrift
}
