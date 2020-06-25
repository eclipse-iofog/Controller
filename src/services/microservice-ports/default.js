/* only "[a-zA-Z0-9][a-zA-Z0-9_.-]" are allowed
 * *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const MicroservicePortManager = require('../../data/managers/microservice-port-manager')
const MicroserviceManager = require('../../data/managers/microservice-manager')
const ConfigManager = require('../../data/managers/config-manager')
const ChangeTrackingService = require('../change-tracking-service')
const AppHelper = require('../../helpers/app-helper')
const Errors = require('../../helpers/errors')
const ErrorMessages = require('../../helpers/error-messages')
const CatalogService = require('../../services/catalog-service')
const Op = require('sequelize').Op
const FogManager = require('../../data/managers/iofog-manager')
const RouterManager = require('../../data/managers/router-manager')
const MicroservicePublicPortManager = require('../../data/managers/microservice-public-port-manager')
const MicroserviceExtraHostManager = require('../../data/managers/microservice-extra-host-manager')

const { DEFAULT_ROUTER_NAME, DEFAULT_PROXY_HOST, RESERVED_PORTS } = require('../../helpers/constants')

const lget = require('lodash/get')

async function _checkForDuplicatePorts (agent, localPort, transaction) {
  if (RESERVED_PORTS.find(port => port === localPort)) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.PORT_RESERVED, localPort))
  }

  const microservices = await agent.getMicroservice()
  for (const microservice of microservices) {
    const ports = await microservice.getPorts()
    if (ports.find(port => port.portExternal === localPort)) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.PORT_NOT_AVAILABLE, localPort))
    }
  }

  const publicPorts = await MicroservicePublicPortManager.findAll({ hostId: agent.uuid }, transaction)
  if (publicPorts.find(port => port.publicPort === localPort)) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.PORT_NOT_AVAILABLE, localPort))
  }
}

async function validatePortMapping (agent, mapping, transaction) {
  await _checkForDuplicatePorts(agent, mapping.external, transaction)

  if (mapping.publicPort) {
    let host
    if (mapping.host && mapping.host !== DEFAULT_ROUTER_NAME) {
      host = await FogManager.findOne({ uuid: mapping.host }, transaction)
      if (!host) {
        throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER_HOST, mapping.host))
      }
    } else {
      host = await FogManager.findOne({ isSystem: true }, transaction)
      if (!host) {
        const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
        if (!defaultRouter) {
          throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER_HOST, DEFAULT_ROUTER_NAME))
        }
      }
    }

    if (host) {
      await _checkForDuplicatePorts(host, mapping.publicPort, transaction)
    }

    mapping.host = host
    mapping.localAgent = agent
  }
}

async function validatePortMappings (microserviceData, transaction) {
  if (!microserviceData.ports || microserviceData.ports.length === 0) {
    return
  }

  const localAgent = await FogManager.findOne({ uuid: microserviceData.iofogUuid }, transaction)
  if (!localAgent) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, microserviceData.iofogUuid))
  }

  for (const mapping of microserviceData.ports) {
    await validatePortMapping(localAgent, mapping, transaction)
  }
}

async function validatePublicPortAppHostTemplate (extraHost, templateArgs, msvc, transaction) {
  if (templateArgs.length !== 5) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, templateArgs.join('.')))
  }

  const ports = await MicroservicePortManager.findAllPublicPorts({ microserviceUuid: msvc.uuid }, transaction)
  for (const port of ports) {
    if (port.publicPort.publicPort === +(templateArgs[4])) {
      const fog = await FogManager.findOne({ uuid: port.publicPort.hostId }, transaction)
      extraHost.publicPort = port.publicPort.publicPort
      extraHost.targetFogUuid = fog.uuid
      extraHost.value = fog.host || fog.ipAddress
      return extraHost
    }
  }

  throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_HOST_TEMPLATE, templateArgs[4]))
}

async function movePublicPortsToNewFog (updatedMicroservice, user, transaction) {
  const portMappings = await updatedMicroservice.getPorts()
  for (const portMapping of portMappings) {
    if (!portMapping.isPublic) {
      continue
    }

    const publicPort = await portMapping.getPublicPort()
    const localMapping = `amqp:${publicPort.queueName}=>${publicPort.protocol}:${portMapping.portExternal}`
    const localProxy = await MicroserviceManager.findOne({ uuid: publicPort.localProxyId }, transaction)
    await _updateOrDeleteProxyMicroservice(localProxy.uuid, localMapping, transaction)

    const destAgent = await FogManager.findOne({ uuid: updatedMicroservice.iofogUuid }, transaction)
    const destAgentsRouter = destAgent.routerId ? await RouterManager.findOne({ id: destAgent.routerId }, transaction) : await RouterManager.findOne({ iofogUuid: destAgent.uuid }, transaction)
    const networkRouter = {
      host: destAgentsRouter.host,
      port: destAgentsRouter.messagingPort
    }
    const newProxy = await _createOrUpdateProxyMicroservice(localMapping, networkRouter, updatedMicroservice.iofogUuid, localProxy.catalogItemId, user, transaction)
    publicPort.localProxyId = newProxy.uuid
    await MicroservicePublicPortManager.updateOrCreate({ id: publicPort.id }, publicPort.toJSON(), transaction)
  }
}

async function createPortMapping (microservice, portMappingData, user, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msPorts = await MicroservicePortManager.findOne({
    microserviceUuid: microservice.uuid,
    [Op.or]:
      [
        {
          portInternal: portMappingData.internal
        },
        {
          portExternal: portMappingData.external
        }
      ]
  }, transaction)
  if (msPorts) {
    throw new Errors.ValidationError(ErrorMessages.PORT_MAPPING_ALREADY_EXISTS)
  }

  if (portMappingData.publicPort) {
    return _createPublicPortMapping(microservice, portMappingData, user, transaction)
  } else {
    return _createSimplePortMapping(microservice, portMappingData, user, transaction)
  }
}

async function _createOrUpdateProxyMicroservice (mapping, networkRouter, hostUuid, proxyCatalogId, user, transaction) {
  const existingProxy = await MicroserviceManager.findOne({ catalogItemId: proxyCatalogId, iofogUuid: hostUuid }, transaction)
  if (existingProxy) {
    const config = JSON.parse(existingProxy.config || '{}')
    config.mappings = (config.mappings || []).concat(mapping)
    existingProxy.config = JSON.stringify(config)
    await MicroserviceManager.updateIfChanged({ uuid: existingProxy.uuid }, { config: JSON.stringify(config) }, transaction)
    await ChangeTrackingService.update(hostUuid, ChangeTrackingService.events.microserviceConfig, transaction)
    return existingProxy
  }

  const proxyMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: 'Proxy',
    config: JSON.stringify({
      mappings: [mapping],
      networkRouter: networkRouter
    }),
    catalogItemId: proxyCatalogId,
    iofogUuid: hostUuid,
    rootHostAccess: true,
    registryId: 1,
    userId: user.id
  }
  const res = await MicroserviceManager.create(proxyMicroserviceData, transaction)
  await ChangeTrackingService.update(hostUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  return res
}

async function _createPublicPortMapping (microservice, portMappingData, user, transaction) {
  const isTcp = portMappingData.protocol === 'tcp'
  const localAgent = portMappingData.localAgent
  const localAgentsRouter = localAgent.routerId ? await RouterManager.findOne({ id: localAgent.routerId }, transaction) : await RouterManager.findOne({ iofogUuid: localAgent.uuid }, transaction)
  const localNetworkRouter = {
    host: localAgentsRouter.host,
    port: localAgentsRouter.messagingPort
  }

  // create proxy microservices
  const queueName = AppHelper.generateRandomString(32)
  const proxyCatalog = await CatalogService.getProxyCatalogItem(transaction)
  const localMapping = `amqp:${queueName}=>${isTcp ? 'tcp' : 'http'}:${portMappingData.external}`
  const remoteMapping = `${isTcp ? 'tcp' : 'http'}:${portMappingData.publicPort}=>amqp:${queueName}`

  const localProxy = await _createOrUpdateProxyMicroservice(
    localMapping,
    localNetworkRouter,
    microservice.iofogUuid,
    proxyCatalog.id,
    user,
    transaction)

  let remoteProxy
  if (portMappingData.host) {
    const hostRouter = portMappingData.host.routerId ? await RouterManager.findOne({ id: portMappingData.host.routerId }, transaction) : await RouterManager.findOne({ iofogUuid: portMappingData.host.uuid }, transaction)
    const remoteNetworkRouter = {
      host: hostRouter.host,
      port: hostRouter.messagingPort
    }

    remoteProxy = await _createOrUpdateProxyMicroservice(
      remoteMapping,
      remoteNetworkRouter,
      portMappingData.host.uuid,
      proxyCatalog.id,
      user,
      transaction)
  }

  const mappingData = {
    isPublic: true,
    portInternal: portMappingData.internal,
    portExternal: portMappingData.external,
    userId: microservice.userId,
    microserviceUuid: microservice.uuid
  }
  const port = await MicroservicePortManager.create(mappingData, transaction)

  const publicPort = {
    portId: port.id,
    hostId: portMappingData.host ? portMappingData.host.uuid : null,
    localProxyId: localProxy.uuid,
    remoteProxyId: portMappingData.host ? remoteProxy.uuid : null,
    publicPort: portMappingData.publicPort,
    queueName,
    isTcp
  }
  await MicroservicePublicPortManager.create(publicPort, transaction)

  // Look for related extraHosts to update
  const relatedExtraHosts = await MicroserviceExtraHostManager.findAll({ microserviceUuid: microservice.uuid, publicPort: publicPort.publicPort }, transaction)
  for (const extraHost of relatedExtraHosts) {
    extraHost.targetFogUuid = publicPort.hostId
    extraHost.value = portMappingData.host.host
    await extraHost.save()
    await MicroserviceExtraHostManager.updateOriginMicroserviceChangeTracking(extraHost, transaction)
  }
}

async function _deletePortMapping (microservice, portMapping, user, transaction) {
  if (portMapping.isPublic) {
    await _deletePublicPortMapping(microservice, portMapping, transaction)
  } else {
    await _deleteSimplePortMapping(microservice, portMapping, user, transaction)
  }
}

async function _updateOrDeleteProxyMicroservice (proxyId, proxyMapping, transaction) {
  const proxy = await MicroserviceManager.findOne({ uuid: proxyId }, transaction)
  if (!proxy) {
    return
  }

  const config = JSON.parse(proxy.config || '{}')
  config.mappings = (config.mappings || []).filter(mapping => mapping !== proxyMapping)
  if (config.mappings.length === 0) {
    await MicroserviceManager.delete({ uuid: proxy.uuid }, transaction)
    await ChangeTrackingService.update(proxy.iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
  } else {
    await MicroserviceManager.updateIfChanged({ uuid: proxy.uuid }, { config: JSON.stringify(config) }, transaction)
    await ChangeTrackingService.update(proxy.iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  }
}

async function _deletePublicPortMapping (microservice, portMapping, transaction) {
  const publicPort = await portMapping.getPublicPort()
  if (publicPort) {
    const protocol = publicPort.isTcp ? 'tcp' : 'http'
    const localMapping = `amqp:${publicPort.queueName}=>${protocol}:${portMapping.portExternal}`
    const remoteMapping = `${protocol}:${publicPort.publicPort}=>amqp:${publicPort.queueName}`

    await _updateOrDeleteProxyMicroservice(publicPort.localProxyId, localMapping, transaction)
    await _updateOrDeleteProxyMicroservice(publicPort.remoteProxyId, remoteMapping, transaction)
  }

  await MicroservicePortManager.delete({ id: portMapping.id }, transaction)
}

async function _createSimplePortMapping (microservice, portMappingData, user, transaction) {
  // create port mapping
  const mappingData = {
    isPublic: false,
    portInternal: portMappingData.internal,
    portExternal: portMappingData.external,
    userId: microservice.userId,
    microserviceUuid: microservice.uuid
  }

  await MicroservicePortManager.create(mappingData, transaction)
  await switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, false, transaction)
}

async function _deleteSimplePortMapping (microservice, msPorts, user, transaction) {
  await MicroservicePortManager.delete({ id: msPorts.id }, transaction)

  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({ uuid: microservice.uuid }, updateRebuildMs, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
}

async function _buildPortsList (portsPairs, transaction) {
  const res = []
  for (const ports of portsPairs) {
    const portMappingResponseData = {
      internal: ports.portInternal,
      external: ports.portExternal,
      publicMode: ports.isPublic
    }
    if (ports.isPublic) {
      const msvcPublicPort = await ports.getPublicPort()
      await buildPublicPortMapping(portMappingResponseData, msvcPublicPort, transaction)
    }
    res.push(portMappingResponseData)
  }
  return res
}

function _buildLink (protocol, host, port) {
  return `${protocol || 'http'}://${host}:${port}`
}

async function buildPublicPortMapping (mapping, publicPortMapping, transaction) {
  const hostRouter = publicPortMapping.hostId ? await RouterManager.findOne({ iofogUuid: publicPortMapping.hostId }, transaction) : { host: lget(await ConfigManager.findOne({ key: DEFAULT_PROXY_HOST }, transaction), 'value', 'undefined-proxy-host') }
  const hostFog = publicPortMapping.hostId ? await FogManager.findOne({ uuid: publicPortMapping.hostId }, transaction) : { uuid: DEFAULT_ROUTER_NAME }
  mapping.publicLink = _buildLink(publicPortMapping.protocol, hostRouter.host, publicPortMapping.publicPort)
  mapping.publicPort = publicPortMapping.publicPort
  mapping.host = hostFog.isSystem ? DEFAULT_ROUTER_NAME : hostFog.uuid
  mapping.protocol = publicPortMapping.protocol
}

async function switchOnUpdateFlagsForMicroservicesForPortMapping (microservice, isPublic, transaction) {
  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({ uuid: microservice.uuid }, updateRebuildMs, transaction)

  if (isPublic) {
    await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  } else {
    await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
  }
}

async function listPortMappings (microserviceUuid, user, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid, userId: user.id }
  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const portsPairs = await MicroservicePortManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
  return _buildPortsList(portsPairs, transaction)
}

async function deletePortMapping (microserviceUuid, internalPort, user, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid, userId: user.id }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  if (!internalPort) {
    throw new Errors.ValidationError(ErrorMessages.PORT_MAPPING_INTERNAL_PORT_NOT_PROVIDED)
  }

  const msPorts = await MicroservicePortManager.findOne({
    microserviceUuid: microservice.uuid,
    portInternal: internalPort
  }, transaction)
  if (!msPorts) {
    throw new Errors.NotFoundError('port mapping not exists')
  }

  await _deletePortMapping(microservice, msPorts, user, transaction)
}

async function deletePortMappings (microservice, user, transaction) {
  const portMappings = await MicroservicePortManager.findAll({ microserviceUuid: microservice.uuid }, transaction)
  for (const ports of portMappings) {
    await _deletePortMapping(microservice, ports, user, transaction)
  }
}

async function getPortMappings (microserviceUuid, transaction) {
  return MicroservicePortManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
}

function listAllPublicPorts (user, transaction) {
  return MicroservicePortManager.findAllPublicPorts(transaction)
}

module.exports = {
  validatePublicPortAppHostTemplate: validatePublicPortAppHostTemplate,
  validatePortMappings: validatePortMappings,
  validatePortMapping: validatePortMapping,
  movePublicPortsToNewFog: movePublicPortsToNewFog,
  switchOnUpdateFlagsForMicroservicesForPortMapping: switchOnUpdateFlagsForMicroservicesForPortMapping,
  createPortMapping: createPortMapping,
  buildPublicPortMapping: buildPublicPortMapping,
  listPortMappings: listPortMappings,
  deletePortMapping: deletePortMapping,
  deletePortMappings: deletePortMappings,
  getPortMappings: getPortMappings,
  listAllPublicPorts: listAllPublicPorts
}
