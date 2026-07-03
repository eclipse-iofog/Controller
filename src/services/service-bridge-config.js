const FogManager = require('../data/managers/iofog-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const ChangeTrackingService = require('./change-tracking-service')
const IofogService = require('./iofog-service')
const {
  ensureSystemApplication,
  getSystemMicroserviceName
} = require('../helpers/system-naming')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')

function isServiceDerivedBridgeKey (name) {
  return typeof name === 'string' && name.endsWith('-listener')
}

function stripServiceDerivedBridges (config) {
  const result = JSON.parse(JSON.stringify(config || {}))
  if (!result.bridges) {
    result.bridges = { tcpConnectors: {}, tcpListeners: {} }
    return result
  }
  if (result.bridges.tcpListeners) {
    for (const key of Object.keys(result.bridges.tcpListeners)) {
      if (isServiceDerivedBridgeKey(key)) {
        delete result.bridges.tcpListeners[key]
      }
    }
  }
  return result
}

function buildTcpListenerForService (service) {
  return IofogService._buildTcpListenerForFog(service)
}

async function _resolveFogTagValues (fogUuid, transaction) {
  const fog = await FogManager.findOneWithTags({ uuid: fogUuid }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogUuid))
  }
  if (fog.tags && fog.tags.length > 0) {
    return fog.tags.map((tag) => tag.value)
  }
  return []
}

async function recomputeServiceBridgeConfig (fogUuid, baseConfig, transaction) {
  // baseConfig must be freshly built from router DB state (connectors/upstreams), not stale MS JSON.
  let config = stripServiceDerivedBridges(baseConfig)

  const tagValues = await _resolveFogTagValues(fogUuid, transaction)
  const serviceTags = await IofogService._extractServiceTags(tagValues)
  if (serviceTags.length === 0) {
    await _persistRouterConfigIfPresent(fogUuid, config, transaction)
    return config
  }

  const services = await IofogService._findMatchingServices(serviceTags, transaction)
  for (const service of services) {
    const listenerConfig = buildTcpListenerForService(service)
    config = IofogService._mergeTcpListener(config, listenerConfig)
  }

  await _persistRouterConfigIfPresent(fogUuid, config, transaction)
  return config
}

async function _persistRouterConfigIfPresent (fogUuid, config, transaction) {
  const fog = await FogManager.findOne({ uuid: fogUuid }, transaction)
  if (!fog) {
    return
  }

  const application = await ensureSystemApplication(fog, transaction)
  const routerName = getSystemMicroserviceName('router')
  const routerMicroservice = await MicroserviceManager.findOne({
    name: routerName,
    applicationId: application.id
  }, transaction)
  if (!routerMicroservice) {
    return
  }

  await MicroserviceManager.update(
    { uuid: routerMicroservice.uuid },
    { config: JSON.stringify(config) },
    transaction
  )
  await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
}

module.exports = {
  isServiceDerivedBridgeKey,
  stripServiceDerivedBridges,
  buildTcpListenerForService,
  recomputeServiceBridgeConfig
}
