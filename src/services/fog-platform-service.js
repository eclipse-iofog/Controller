const TransactionDecorator = require('../decorators/transaction-decorator')
const AppHelper = require('../helpers/app-helper')
const Constants = require('../helpers/constants')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const FogManager = require('../data/managers/iofog-manager')
const FogPlatformSpecManager = require('../data/managers/fog-platform-spec-manager')
const FogPlatformStatusManager = require('../data/managers/fog-platform-status-manager')
const RouterManager = require('../data/managers/router-manager')
const RouterConnectionManager = require('../data/managers/router-connection-manager')
const NatsInstanceManager = require('../data/managers/nats-instance-manager')
const NatsConnectionManager = require('../data/managers/nats-connection-manager')
const ChangeTrackingService = require('./change-tracking-service')
const IofogService = require('./iofog-service')
const NatsService = require('./nats-service')
const ReconcileOutboxManager = require('../data/managers/reconcile-outbox-manager')
const RouterService = require('./router-service')
const ServiceBridgeConfig = require('./service-bridge-config')
const transactionRunner = require('../helpers/transaction-runner')
const { PRIORITY_BACKGROUND } = transactionRunner
const logger = require('../logger')

function buildFogDataFromSpecAndFog (fog, spec) {
  const specTags = Array.isArray(spec.tags) ? spec.tags.map((tag) => tag.value) : []
  const fogTags = fog.tags ? fog.tags.map((tag) => tag.value) : []

  return {
    uuid: fog.uuid,
    name: fog.name,
    isSystem: fog.isSystem,
    host: spec.host != null ? spec.host : fog.host,
    routerMode: spec.routerMode,
    natsMode: spec.natsMode,
    messagingPort: spec.messagingPort,
    interRouterPort: spec.interRouterPort,
    edgeRouterPort: spec.edgeRouterPort,
    upstreamRouters: spec.upstreamRouters,
    upstreamNatsServers: spec.upstreamNatsServers,
    natsServerPort: spec.natsServerPort,
    natsLeafPort: spec.natsLeafPort,
    natsClusterPort: spec.natsClusterPort,
    natsMqttPort: spec.natsMqttPort,
    natsHttpPort: spec.natsHttpPort,
    jsStorageSize: spec.jsStorageSize,
    jsMemoryStoreSize: spec.jsMemoryStoreSize,
    networkRouter: spec.networkRouter,
    containerEngine: spec.containerEngine || fog.containerEngine,
    bluetoothEnabled: spec.bluetoothEnabled != null ? spec.bluetoothEnabled : fog.bluetoothEnabled,
    abstractedHardwareEnabled: spec.abstractedHardwareEnabled != null
      ? spec.abstractedHardwareEnabled
      : fog.abstractedHardwareEnabled,
    tags: fogTags.length > 0 ? fogTags : specTags
  }
}

function validateSystemFogInvariants (fog, spec) {
  if (!fog.isSystem) {
    return
  }
  if (spec.routerMode !== 'interior') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER_MODE, spec.routerMode))
  }
  if (spec.natsMode !== 'server') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_NATS_MODE, spec.natsMode))
  }
}

function buildNatsConfig (spec) {
  return {
    mode: spec.natsMode,
    serverPort: spec.natsServerPort,
    leafPort: spec.natsLeafPort,
    clusterPort: spec.natsClusterPort,
    mqttPort: spec.natsMqttPort,
    httpPort: spec.natsHttpPort,
    upstreamNatsServers: spec.upstreamNatsServers,
    jsStorageSize: spec.jsStorageSize || NatsService.DEFAULT_JS_STORAGE_SIZE,
    jsMemoryStoreSize: spec.jsMemoryStoreSize || NatsService.DEFAULT_JS_MEMORY_STORE_SIZE
  }
}

function _getRouterUuid (router, defaultRouter) {
  return (defaultRouter && router.id === defaultRouter.id)
    ? Constants.DEFAULT_ROUTER_NAME
    : router.iofogUuid
}

function _getNatsUuid (nats, defaultHub) {
  return (defaultHub && nats.id === defaultHub.id)
    ? Constants.DEFAULT_NATS_HUB_NAME
    : nats.iofogUuid
}

async function captureTopologySnapshot (fogUuid, transaction) {
  const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  const defaultHub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  const router = await RouterManager.findOne({ iofogUuid: fogUuid }, transaction)
  const nats = await NatsInstanceManager.findByFog(fogUuid, transaction)

  let upstreamRouters = []
  if (router) {
    const connections = await RouterConnectionManager.findAllWithRouters({ sourceRouter: router.id }, transaction)
    upstreamRouters = (connections || []).map((connection) => _getRouterUuid(connection.dest, defaultRouter)).sort()
  }

  let upstreamNatsServers = []
  if (nats) {
    const connections = await NatsConnectionManager.findAllWithNats({ sourceNats: nats.id }, transaction)
    upstreamNatsServers = (connections || []).map((connection) => _getNatsUuid(connection.dest, defaultHub)).sort()
  }

  return {
    routerMode: router ? (router.isEdge ? 'edge' : 'interior') : 'none',
    natsMode: nats ? (nats.isLeaf ? 'leaf' : 'server') : 'none',
    upstreamRouters: upstreamRouters.join(','),
    upstreamNatsServers: upstreamNatsServers.join(',')
  }
}

function topologyChanged (before, after) {
  return before.routerMode !== after.routerMode ||
    before.natsMode !== after.natsMode ||
    before.upstreamRouters !== after.upstreamRouters ||
    before.upstreamNatsServers !== after.upstreamNatsServers
}

function truncateErrorMessage (errorMessage, maxLength = 200) {
  return errorMessage.length > maxLength ? errorMessage.slice(0, maxLength) : errorMessage
}

async function markReconcileFailed (fogUuid, error, transaction) {
  const errorMessage = error.message || String(error)
  const shortError = truncateErrorMessage(errorMessage)

  await FogPlatformStatusManager.setPhase(fogUuid, 'Failed', {
    lastError: errorMessage
  }, transaction)
  await FogManager.update({ uuid: fogUuid }, {
    warningMessage: `Platform reconcile: ${shortError}`
  }, transaction)
}

function buildReadyConditions (spec, router, nats) {
  const routerReady = spec.routerMode === 'none' || !!router
  const natsReady = spec.natsMode === 'none' || !!nats
  return [
    { type: 'RouterReady', status: routerReady ? 'True' : 'False', reason: 'ReconcileComplete' },
    { type: 'NatsReady', status: natsReady ? 'True' : 'False', reason: 'ReconcileComplete' }
  ]
}

async function reconcileFogPrepare (fogUuid, transaction) {
  const fog = await FogManager.findOneWithTags({ uuid: fogUuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogUuid))
  }

  const parsedSpec = await FogPlatformSpecManager.getParsedSpec(fogUuid, transaction)
  if (!parsedSpec) {
    throw new Errors.NotFoundError(`Fog platform spec not found for fog ${fogUuid}`)
  }

  const status = await FogPlatformStatusManager.getParsedStatus(fogUuid, transaction)
  if (status && status.phase === 'Deleting') {
    return {
      skipped: true,
      reason: 'deleting',
      generation: parsedSpec.generation,
      phase: status.phase
    }
  }

  const generation = parsedSpec.generation
  const spec = parsedSpec.spec
  const fogData = buildFogDataFromSpecAndFog(fog, spec)
  const topologyBefore = await captureTopologySnapshot(fogUuid, transaction)

  await FogPlatformStatusManager.setPhase(fogUuid, 'Progressing', { lastError: null }, transaction)
  validateSystemFogInvariants(fog, spec)

  const router = await RouterManager.findOne({ iofogUuid: fogUuid }, transaction)
  const oldRouterMode = router ? (router.isEdge ? 'edge' : 'interior') : 'none'
  const isRouterModeChanged = spec.routerMode !== oldRouterMode &&
    (spec.routerMode === 'none' || oldRouterMode === 'none')
  const isHostChanged = spec.host != null && spec.host !== fog.host
  const shouldRecreateCerts = isRouterModeChanged || isHostChanged

  return {
    fog,
    spec,
    fogData,
    generation,
    topologyBefore,
    shouldRecreateCerts,
    isHostChanged,
    natsConfig: buildNatsConfig(spec),
    isFirstReconcile: !status || status.observedGeneration === 0,
    router
  }
}

async function reconcileFogCertPrep (fogUuid, prep) {
  await transactionRunner.runInTransaction(
    (transaction) => IofogService._handleRouterCertificates(
      prep.fogData,
      fogUuid,
      prep.shouldRecreateCerts,
      transaction
    ),
    { priority: PRIORITY_BACKGROUND, label: 'fogPlatform.certPrep' }
  )

  if (prep.shouldRecreateCerts) {
    await transactionRunner.runInTransaction(
      (transaction) => ChangeTrackingService.update(
        fogUuid,
        ChangeTrackingService.events.volumeMounts,
        transaction
      ),
      { priority: PRIORITY_BACKGROUND, label: 'fogPlatform.certPrepVolumeMounts' }
    )
  }

  if (prep.isHostChanged && prep.spec.natsMode !== 'none') {
    await transactionRunner.runInTransaction(
      (transaction) => IofogService._reconcileNatsCertificatesOnHostChange(prep.fog, transaction),
      { priority: PRIORITY_BACKGROUND, label: 'fogPlatform.certPrepNatsHost' }
    )
  }
}

async function reconcileFogNats (fogUuid, prep) {
  if (prep.spec.natsMode === 'none') {
    await NatsService.cleanupNatsForFogPhased(prep.fog)
    await transactionRunner.runInTransaction(async (transaction) => {
      await IofogService._deleteNatsMicroserviceByFog(prep.fogData, transaction)
      await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.microserviceList, transaction)
    }, { priority: PRIORITY_BACKGROUND, label: 'fogPlatform.natsCleanup' })
  } else {
    await NatsService.ensureNatsForFogPhased(prep.fog, prep.natsConfig)
  }
}

async function reconcileFogPlatform (fogUuid, prep, transaction) {
  const { fog, spec, fogData, router } = prep
  let networkRouter = null

  if (spec.routerMode === 'none') {
    networkRouter = await RouterService.getNetworkRouter(spec.networkRouter, transaction)
    if (!networkRouter) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(
        ErrorMessages.INVALID_ROUTER,
        spec.networkRouter || Constants.DEFAULT_ROUTER_NAME
      ))
    }
    if (router) {
      await IofogService._deleteFogRouter(fogData, transaction)
    }
    await FogManager.update({ uuid: fogUuid }, { routerId: networkRouter.id }, transaction)
  } else {
    const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
    const upstreamConnections = router
      ? await RouterConnectionManager.findAllWithRouters({ sourceRouter: router.id }, transaction)
      : []
    let upstreamRoutersIofogUuid
    if (spec.upstreamRouters !== undefined) {
      upstreamRoutersIofogUuid = spec.upstreamRouters
    } else if (upstreamConnections && upstreamConnections.length > 0) {
      upstreamRoutersIofogUuid = upstreamConnections.map(
        (connection) => _getRouterUuid(connection.dest, defaultRouter)
      )
    } else {
      upstreamRoutersIofogUuid = undefined
    }
    const upstreamRouters = await RouterService.validateAndReturnUpstreamRouters(
      upstreamRoutersIofogUuid,
      fog.isSystem,
      defaultRouter,
      transaction
    )

    const host = spec.host || (router ? router.host : null)
    if (!router) {
      networkRouter = await RouterService.createRouterForFog(fogData, fogUuid, upstreamRouters, transaction)
    } else {
      networkRouter = await RouterService.updateRouter(router, {
        messagingPort: spec.messagingPort || router.messagingPort,
        interRouterPort: spec.interRouterPort || router.interRouterPort,
        edgeRouterPort: spec.edgeRouterPort || router.edgeRouterPort,
        isEdge: spec.routerMode === 'edge',
        host
      }, upstreamRouters, spec.containerEngine || fog.containerEngine, transaction)
    }

    const baseRouterConfig = await IofogService._getRouterMicroserviceConfig(fogUuid, transaction)
    await ServiceBridgeConfig.recomputeServiceBridgeConfig(fogUuid, baseRouterConfig, transaction)
  }

  if (spec.host && spec.host !== fog.host) {
    await IofogService._updateMicroserviceExtraHosts(fogUuid, spec.host, transaction)
  }

  if (fog.abstractedHardwareEnabled === true && spec.abstractedHardwareEnabled === false) {
    await IofogService._deleteHalMicroserviceByFog(fogData, transaction)
    await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  } else if (fog.abstractedHardwareEnabled === false && spec.abstractedHardwareEnabled === true) {
    await IofogService._createHalMicroserviceForFog(fogData, fog, transaction)
    await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  }

  if (fog.bluetoothEnabled === true && spec.bluetoothEnabled === false) {
    await IofogService._deleteBluetoothMicroserviceByFog(fogData, transaction)
    await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  } else if (fog.bluetoothEnabled === false && spec.bluetoothEnabled === true) {
    await IofogService._createBluetoothMicroserviceForFog(fogData, fog, transaction)
    await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  }

  if (prep.isFirstReconcile) {
    await ChangeTrackingService.create(fogUuid, transaction)
  }
  await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.microserviceCommon, transaction)

  return { networkRouter }
}

async function reconcileFogFinalize (fogUuid, prep, platformResult, transaction) {
  const { spec, generation, topologyBefore } = prep

  const routerAfter = await RouterManager.findOne({ iofogUuid: fogUuid }, transaction)
  const natsAfter = await NatsInstanceManager.findByFog(fogUuid, transaction)
  const topologyAfter = await captureTopologySnapshot(fogUuid, transaction)

  if (topologyChanged(topologyBefore, topologyAfter)) {
    await ReconcileOutboxManager.enqueueNats({
      reason: 'cluster-routes-changed',
      fogUuids: [fogUuid]
    }, transaction)
  }

  await FogPlatformStatusManager.setPhase(fogUuid, 'Ready', {
    observedGeneration: generation,
    lastError: null,
    conditions: buildReadyConditions(spec, routerAfter, natsAfter)
  }, transaction)

  await FogManager.update({ uuid: fogUuid }, { warningMessage: 'HEALTHY' }, transaction)

  return {
    networkRouterId: platformResult.networkRouter ? platformResult.networkRouter.id : null
  }
}

async function reconcileFog (fogUuid) {
  const startedAt = Date.now()
  let generation = null
  let phase = 'Progressing'

  try {
    const prep = await transactionRunner.runInTransaction(
      (transaction) => reconcileFogPrepare(fogUuid, transaction),
      { priority: PRIORITY_BACKGROUND, label: 'fogPlatform.prepare' }
    )

    if (prep.skipped) {
      logger.info('fogPlatformReconcile skipped delete-owned fog', {
        fogUuid,
        generation: prep.generation,
        phase: prep.phase,
        durationMs: Date.now() - startedAt
      })
      return { skipped: true, reason: prep.reason }
    }

    generation = prep.generation

    await reconcileFogCertPrep(fogUuid, prep)
    await reconcileFogNats(fogUuid, prep)

    const platformResult = await transactionRunner.runInTransaction(
      (transaction) => reconcileFogPlatform(fogUuid, prep, transaction),
      { priority: PRIORITY_BACKGROUND, label: 'fogPlatform.platform' }
    )

    const finalizeResult = await transactionRunner.runInTransaction(
      (transaction) => reconcileFogFinalize(fogUuid, prep, platformResult, transaction),
      { priority: PRIORITY_BACKGROUND, label: 'fogPlatform.finalize' }
    )

    phase = 'Ready'
    logger.info('fogPlatformReconcile completed', {
      fogUuid,
      generation,
      phase,
      durationMs: Date.now() - startedAt
    })

    return {
      fogUuid,
      generation,
      phase,
      networkRouterId: finalizeResult.networkRouterId
    }
  } catch (error) {
    logger.error('fogPlatformReconcile failed', {
      fogUuid,
      generation,
      phase,
      durationMs: Date.now() - startedAt,
      error: error.message
    })
    throw error
  }
}

async function reconcileFogDelete (fogUuid, transaction) {
  const startedAt = Date.now()

  const fog = await FogManager.findOne({ uuid: fogUuid }, transaction)
  if (!fog) {
    logger.info('fogPlatformReconcile delete skipped missing fog', {
      fogUuid,
      durationMs: Date.now() - startedAt
    })
    return { skipped: true, reason: 'not-found' }
  }

  logger.info('fogPlatformReconcile delete starting', { fogUuid })

  const parsedSpec = await FogPlatformSpecManager.getParsedSpec(fogUuid, transaction)
  const fogData = parsedSpec
    ? buildFogDataFromSpecAndFog(fog, parsedSpec.spec)
    : { uuid: fogUuid, name: fog.name, containerEngine: fog.containerEngine }

  await IofogService._deleteFogRouter(fogData, transaction)
  logger.info('fogPlatformReconcile delete router removed', { fogUuid })
  await IofogService._processDeleteCommand(fog, transaction)

  logger.info('fogPlatformReconcile delete completed', {
    fogUuid,
    phase: 'Deleting',
    durationMs: Date.now() - startedAt
  })

  return { fogUuid, deleted: true }
}

module.exports = {
  buildFogDataFromSpecAndFog,
  validateSystemFogInvariants,
  captureTopologySnapshot,
  topologyChanged,
  markReconcileFailed,
  reconcileFogPrepare,
  reconcileFogCertPrep,
  reconcileFogNats,
  reconcileFogPlatform,
  reconcileFogFinalize,
  reconcileFog,
  reconcileFogDelete: TransactionDecorator.generateTransaction(reconcileFogDelete)
}
