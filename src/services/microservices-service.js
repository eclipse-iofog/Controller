/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
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
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceArgManager = require('../data/managers/microservice-arg-manager')
const MicroserviceEnvManager = require('../data/managers/microservice-env-manager')
const MicroservicePortManager = require('../data/managers/microservice-port-manager')
const CatalogItemImageManager = require('../data/managers/catalog-item-image-manager')
const RegistryManager = require('../data/managers/registry-manager')
const MicroserviceStates = require('../enums/microservice-state')
const VolumeMappingManager = require('../data/managers/volume-mapping-manager')
const ConfigManager = require('../data/managers/config-manager')
const ChangeTrackingService = require('./change-tracking-service')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const Validator = require('../schemas/index')
const FlowManager = require('../data/managers/flow-manager')
const CatalogService = require('../services/catalog-service')
const RoutingManager = require('../data/managers/routing-manager')
const Op = require('sequelize').Op
const TrackingDecorator = require('../decorators/tracking-decorator')
const TrackingEventType = require('../enums/tracking-event-type')
const FogManager = require('../data/managers/iofog-manager')
const RouterManager = require('../data/managers/router-manager')
const MicroservicePublicPortManager = require('../data/managers/microservice-public-port-manager')
const MicroserviceExtraHostManager = require('../data/managers/microservice-extra-host-manager')

const { DEFAULT_ROUTER_NAME, DEFAULT_PROXY_HOST, RESERVED_PORTS } = require('../helpers/constants')

const lget = require('lodash/get')

async function listMicroservicesEndPoint (flowId, user, isCLI, transaction) {
  if (!isCLI) {
    await _validateFlow(flowId, user, isCLI, transaction)
  }

  const where = isCLI ? { delete: false } : { flowId: flowId, delete: false }
  const microservices = await MicroserviceManager.findAllExcludeFields(where, transaction)

  const res = await Promise.all(microservices.map(async (microservice) => {
    return _buildGetMicroserviceResponse(microservice, transaction)
  }))
  return {
    microservices: res
  }
}

async function getMicroserviceEndPoint (microserviceUuid, user, isCLI, transaction) {
  if (!isCLI) {
    await _validateMicroserviceOnGet(user.id, microserviceUuid, transaction)
  }

  const microservice = await MicroserviceManager.findOneExcludeFields({
    uuid: microserviceUuid, delete: false
  }, transaction)

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  return _buildGetMicroserviceResponse(microservice, transaction)
}

function _validateImagesAgainstCatalog (catalogItem, images) {
  const allImagesEmpty = images.reduce((result, b) => result && b.containerImage === '', true)
  if (allImagesEmpty) {
    return
  }
  for (const img of images) {
    let found = false
    for (const catalogImg of catalogItem.images) {
      if (catalogImg.fogType === img.fogType) {
        found = true
      }
      if (found === true && img.containerImage !== '' && catalogImg.containerImage !== img.containerImage) {
        throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.CATALOG_NOT_MATCH_IMAGES, `${catalogItem.id}`))
      }
    }
    if (!found) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.CATALOG_NOT_MATCH_IMAGES, `${catalogItem.id}`))
    }
  }
}

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

async function _validatePortMapping (agent, mapping, transaction) {
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

async function _validatePortMappings (microserviceData, transaction) {
  if (!microserviceData.ports || microserviceData.ports.length === 0) {
    return
  }

  const localAgent = await FogManager.findOne({ uuid: microserviceData.iofogUuid }, transaction)
  if (!localAgent) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, microserviceData.iofogUuid))
  }

  for (const mapping of microserviceData.ports) {
    await _validatePortMapping(localAgent, mapping, transaction)
  }
}

async function _validatePublicPortAppHostTemplate (extraHost, templateArgs, msvc, transaction) {
  if (templateArgs.length !== 5) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, templateArgs.join('.')))
  }

  const ports = await MicroservicePortManager.findAll({ microserviceUuid: msvc.uuid, isPublic: true }, transaction)
  for (const port of ports) {
    const publicPort = await MicroservicePublicPortManager.findOne({ portId: port.id }, transaction)
    if (publicPort && publicPort.publicPort === +(templateArgs[4])) {
      extraHost.publicPort = publicPort.publicPort
      extraHost.value = ''
      extraHost.targetFogUuid = (await FogManager.findOne({ id: publicPort.hostId }, transaction)).uuid
      return extraHost
    }
  }

  throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_HOST_TEMPLATE, templateArgs[4]))
}

async function _validateLocalAppHostTemplate (extraHost, templateArgs, msvc, transaction) {
  if (templateArgs.length !== 4) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, templateArgs.join('.')))
  }
  const fog = await FogManager.findOne({ uuid: msvc.iofogUuid }, transaction)
  if (!fog) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_HOST_TEMPLATE, templateArgs[2]))
  }
  extraHost.targetFogUuid = fog.uuid
  extraHost.value = fog.host || fog.ipAddress

  return extraHost
}

async function _validateAppHostTemplate (extraHost, templateArgs, userId, transaction) {
  if (templateArgs.length < 4) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, templateArgs.join('.')))
  }
  const flow = await FlowManager.findOne({ name: templateArgs[1], userId }, transaction)
  if (!flow) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_HOST_TEMPLATE, templateArgs[1]))
  }
  const msvc = await MicroserviceManager.findOne({ flowId: flow.id, name: templateArgs[2] }, transaction)
  if (!msvc) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_HOST_TEMPLATE, templateArgs[2]))
  }
  extraHost.templateType = 'Apps'
  extraHost.targetMicroserviceUuid = msvc.uuid
  if (templateArgs[3] === 'public') {
    return _validatePublicPortAppHostTemplate(extraHost, templateArgs, msvc, transaction)
  }
  if (templateArgs[3] === 'local') {
    return _validateLocalAppHostTemplate(extraHost, templateArgs, msvc, transaction)
  }
  throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, templateArgs.join('.')))
}

async function _validateAgentHostTemplate (extraHost, templateArgs, userId, transaction) {
  if (templateArgs.length !== 2) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, templateArgs.join('.')))
  }

  extraHost.templateType = 'Agents'
  console.log({ name: templateArgs[1], userId })
  const fog = await FogManager.findOne({ name: templateArgs[1], userId }, transaction)
  if (!fog) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_HOST_TEMPLATE, templateArgs[1]))
  }
  extraHost.targetFogUuid = fog.uuid
  extraHost.value = fog.host

  return extraHost
}

async function _validateExtraHost (extraHostData, user, transaction) {
  const extraHost = {
    templateType: 'Litteral',
    name: extraHostData.name,
    template: extraHostData.address,
    value: extraHostData.address
  }
  if (!(extraHost.template.startsWith('${') && extraHost.template.endsWith('}'))) {
    return extraHost
  }
  const template = extraHost.value.slice(2, extraHost.value.length - 1)
  const templateArgs = template.split('.')
  extraHost.templateType = templateArgs[0]
  if (templateArgs[0] === 'Apps') {
    return _validateAppHostTemplate(extraHost, templateArgs, user.id, transaction)
  } else if (templateArgs[0] === 'Agents') {
    return _validateAgentHostTemplate(extraHost, templateArgs, user.id, transaction)
  }
  throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_HOST_TEMPLATE, template))
}

async function _validateExtraHosts (microserviceData, user, transaction) {
  if (!microserviceData.extraHosts || microserviceData.extraHosts.length === 0) {
    return []
  }
  const extraHosts = []
  for (const extraHost of microserviceData.extraHosts) {
    extraHosts.push(await _validateExtraHost(extraHost, user, transaction))
  }
  return extraHosts
}

async function createMicroserviceEndPoint (microserviceData, user, isCLI, transaction) {
  await Validator.validate(microserviceData, Validator.schemas.microserviceCreate)

  // validate images
  if (microserviceData.catalogItemId) {
    // validate catalog item
    const catalogItem = await CatalogService.getCatalogItem(microserviceData.catalogItemId, user, isCLI, transaction)
    _validateImagesAgainstCatalog(catalogItem, microserviceData.images || [])
    microserviceData.images = catalogItem.images
  }

  if (!microserviceData.images || !microserviceData.images.length) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_DOES_NOT_HAVE_IMAGES, microserviceData.name))
  }

  // validate extraHosts
  const extraHosts = await _validateExtraHosts(microserviceData, user, transaction)

  await _validatePortMappings(microserviceData, transaction)

  const microservice = await _createMicroservice(microserviceData, user, isCLI, transaction)

  if (!microserviceData.catalogItemId) {
    await _createMicroserviceImages(microservice, microserviceData.images, transaction)
  }

  const publicPorts = []
  if (microserviceData.ports) {
    for (const mapping of microserviceData.ports) {
      const res = await _createPortMapping(microservice, mapping, user, transaction)
      if (res && res.publicLink) {
        publicPorts.push({
          internal: mapping.internal,
          external: mapping.external,
          publicLink: res.publicLink
        })
      }
    }
  }

  for (const extraHost of extraHosts) {
    await _createExtraHost(microservice, extraHost, user, transaction)
  }

  if (microserviceData.env) {
    for (const env of microserviceData.env) {
      await _createEnv(microservice, env, user, transaction)
    }
  }
  if (microserviceData.cmd) {
    for (const arg of microserviceData.cmd) {
      await _createArg(microservice, arg, user, transaction)
    }
  }
  if (microserviceData.volumeMappings) {
    await _createVolumeMappings(microservice, microserviceData.volumeMappings, transaction)
  }

  if (microserviceData.routes) {
    await _createRoutes(microservice, microserviceData.routes, user, isCLI, transaction)
  }

  if (microserviceData.iofogUuid) {
    await _updateChangeTracking(false, microserviceData.iofogUuid, transaction)
  }

  await _createMicroserviceStatus(microservice, transaction)

  const res = {
    uuid: microservice.uuid
  }
  if (publicPorts.length) {
    res.publicPorts = publicPorts
  }

  return res
}

async function updateMicroserviceEndPoint (microserviceUuid, microserviceData, user, isCLI, transaction) {
  await Validator.validate(microserviceData, Validator.schemas.microserviceUpdate)

  const query = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid,
      userId: user.id
    }

  const config = _validateMicroserviceConfig(microserviceData.config)

  const microserviceToUpdate = {
    name: microserviceData.name,
    config: config,
    images: microserviceData.images,
    catalogItemId: microserviceData.catalogItemId,
    rebuild: microserviceData.rebuild,
    iofogUuid: microserviceData.iofogUuid,
    rootHostAccess: microserviceData.rootHostAccess,
    logSize: (microserviceData.logLimit || 50) * 1,
    registryId: microserviceData.registryId,
    volumeMappings: microserviceData.volumeMappings,
    env: microserviceData.env,
    cmd: microserviceData.cmd
  }

  const microserviceDataUpdate = AppHelper.deleteUndefinedFields(microserviceToUpdate)

  const microservice = await MicroserviceManager.findOneWithCategory(query, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (microserviceDataUpdate.registryId) {
    const registry = await RegistryManager.findOne({ id: microserviceDataUpdate.registryId }, transaction)
    if (!registry) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, microserviceDataUpdate.registryId))
    }
  } else {
    microserviceDataUpdate.registryId = microservice.registryId
  }

  if (microserviceDataUpdate.iofogUuid && microservice.iofogUuid !== microserviceDataUpdate.iofogUuid) {
    // Moving to new agent, make sure all ports are available
    const ports = await microservice.getPorts()
    const data = {
      ports: [],
      iofogUuid: microserviceData.iofogUuid
    }

    for (const port of ports) {
      data.ports.push({
        internal: port.portInternal,
        external: port.portExternal
      })
    }

    if (data.ports.length) {
      await _validatePortMappings(data, transaction)
    }
  }

  if (microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }

  // Validate images vs catalog item
  if (microserviceDataUpdate.catalogItemId) {
    const catalogItem = await CatalogService.getCatalogItem(microserviceDataUpdate.catalogItemId, user, isCLI, transaction)
    _validateImagesAgainstCatalog(catalogItem, microserviceDataUpdate.images || [])
    if (microserviceDataUpdate.catalogItemId !== undefined && microserviceDataUpdate.catalogItemId !== microservice.catalogItemId) {
      // Catalog item changed or removed, set rebuild flag
      microserviceDataUpdate.rebuild = true
      // If catalog item is set, set registry and msvc images
      if (microserviceDataUpdate.catalogItemId) {
        await _deleteImages(microserviceUuid, transaction)
        microserviceDataUpdate.registryId = catalogItem.registryId || 1
      }
    }
  } else if (!microservice.catalogItemId && microserviceDataUpdate.images && microserviceDataUpdate.images.length === 0) {
    // No catalog, and no image
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_DOES_NOT_HAVE_IMAGES, microserviceData.name))
  } else if (microserviceDataUpdate.images && microserviceDataUpdate.images.length > 0) {
    // No catalog, and images
    await _updateImages(microserviceDataUpdate.images, microserviceUuid, transaction)
    // Images updated, set rebuild flag to true
    microserviceDataUpdate.rebuild = true
  }

  const iofogUuid = microserviceDataUpdate.iofogUuid || microservice.iofogUuid

  if (microserviceDataUpdate.name) {
    const userId = isCLI ? microservice.userId : user.id
    await _checkForDuplicateName(microserviceDataUpdate.name, { id: microserviceUuid }, userId, transaction)
  }

  // validate fog node
  if (iofogUuid) {
    const fog = await FogManager.findOne({ uuid: iofogUuid }, transaction)
    if (!fog || fog.length === 0) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, iofogUuid))
    }
  }

  const updatedMicroservice = await MicroserviceManager.updateAndFind(query, microserviceDataUpdate, transaction)

  if (microserviceDataUpdate.volumeMappings) {
    await _updateVolumeMappings(microserviceDataUpdate.volumeMappings, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.env) {
    await _updateEnv(microserviceDataUpdate.env, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.cmd) {
    await _updateArg(microserviceDataUpdate.cmd, microserviceUuid, transaction)
  }

  if (microserviceDataUpdate.iofogUuid && microserviceDataUpdate.iofogUuid !== microservice.iofogUuid) {
    await _movePublicPortsToNewFog(updatedMicroservice, user, transaction)
  }

  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceRouting, transaction)
  await ChangeTrackingService.update(updatedMicroservice.iofogUuid, ChangeTrackingService.events.microserviceRouting, transaction)

  await _updateChangeTracking(true, microservice.iofogUuid, transaction)
  await _updateChangeTracking(true, updatedMicroservice.iofogUuid, transaction)
}

async function _movePublicPortsToNewFog (updatedMicroservice, user, transaction) {
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

async function deleteMicroserviceEndPoint (microserviceUuid, microserviceData, user, isCLI, transaction) {
  const where = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid,
      userId: user.id
    }

  const microservice = await MicroserviceManager.findOneWithStatusAndCategory(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (!isCLI && microservice.catalogItem && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_DELETE, microserviceUuid))
  }

  await deleteMicroserviceWithRoutesAndPortMappings(microservice, transaction)

  await _updateChangeTracking(false, microservice.iofogUuid, transaction)
}

async function deleteNotRunningMicroservices (fog, transaction) {
  const microservices = await MicroserviceManager.findAllWithStatuses({ iofogUuid: fog.uuid }, transaction)
  microservices
    .filter((microservice) => microservice.delete)
    .filter((microservice) => microservice.microserviceStatus.status === MicroserviceStates.UNKNOWN ||
      microservice.microserviceStatus.status === MicroserviceStates.STOPPING ||
      microservice.microserviceStatus.status === MicroserviceStates.DELETING ||
      microservice.microserviceStatus.status === MicroserviceStates.MARKED_FOR_DELETION)
    .forEach(async (microservice) => { await deleteMicroserviceWithRoutesAndPortMappings(microservice, transaction) })
}

async function createRouteEndPoint (sourceMicroserviceUuid, destMicroserviceUuid, user, isCLI, transaction) {
  const sourceWhere = isCLI
    ? { uuid: sourceMicroserviceUuid }
    : { uuid: sourceMicroserviceUuid, userId: user.id }

  const sourceMicroservice = await MicroserviceManager.findOne(sourceWhere, transaction)
  if (!sourceMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_SOURCE_MICROSERVICE_UUID, sourceMicroserviceUuid))
  }

  const destWhere = isCLI
    ? { uuid: destMicroserviceUuid }
    : { uuid: destMicroserviceUuid, userId: user.id }

  const destMicroservice = await MicroserviceManager.findOne(destWhere, transaction)
  if (!destMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_DEST_MICROSERVICE_UUID, destMicroserviceUuid))
  }

  await _createRoute(sourceMicroservice, destMicroservice, user, transaction)
}

async function _createRoute (sourceMicroservice, destMicroservice, user, transaction) {
  if (!sourceMicroservice.iofogUuid || !destMicroservice.iofogUuid) {
    throw new Errors.ValidationError('fog not set')
  }
  if (sourceMicroservice.flowId !== destMicroservice.flowId) {
    throw new Errors.ValidationError('microservices on different flows')
  }

  const route = await RoutingManager.findOne({
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid
  }, transaction)
  if (route) {
    throw new Errors.ValidationError('route already exists')
  }

  await _createSimpleRoute(sourceMicroservice, destMicroservice, transaction)
}

async function deleteRouteEndPoint (sourceMicroserviceUuid, destMicroserviceUuid, user, isCLI, transaction) {
  const sourceWhere = isCLI
    ? { uuid: sourceMicroserviceUuid }
    : { uuid: sourceMicroserviceUuid, userId: user.id }

  const sourceMicroservice = await MicroserviceManager.findOne(sourceWhere, transaction)
  if (!sourceMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_SOURCE_MICROSERVICE_UUID, sourceMicroserviceUuid))
  }

  const destWhere = isCLI
    ? { uuid: destMicroserviceUuid }
    : { uuid: destMicroserviceUuid, userId: user.id }

  const destMicroservice = await MicroserviceManager.findOne(destWhere, transaction)
  if (!destMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_DEST_MICROSERVICE_UUID, destMicroserviceUuid))
  }

  const route = await RoutingManager.findOne({
    sourceMicroserviceUuid: sourceMicroserviceUuid,
    destMicroserviceUuid: destMicroserviceUuid
  }, transaction)
  if (!route) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.ROUTE_NOT_FOUND))
  }

  await _deleteSimpleRoute(route, transaction)
}

async function createPortMappingEndPoint (microserviceUuid, portMappingData, user, isCLI, transaction) {
  await Validator.validate(portMappingData, Validator.schemas.portsCreate)

  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid, userId: user.id }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const agent = await FogManager.findOne({ uuid: microservice.iofogUuid }, transaction)
  if (!agent) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, microservice.iofogUuid))
  }
  await _validatePortMapping(agent, portMappingData, transaction)

  return _createPortMapping(microservice, portMappingData, user, transaction)
}

async function _createPortMapping (microservice, portMappingData, user, transaction) {
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
}

async function _createExtraHost (microservice, extraHostData, user, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msExtraHostData = {
    ...extraHostData,
    microserviceUuid: microservice.uuid
  }

  await MicroserviceExtraHostManager.create(msExtraHostData, transaction)
}

async function _createEnv (microservice, envData, user, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msEnvData = {
    key: envData.key,
    value: envData.value,
    userId: microservice.userId,
    microserviceUuid: microservice.uuid
  }

  await MicroserviceEnvManager.create(msEnvData, transaction)
  await _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, false, transaction)
}

async function _createArg (microservice, arg, user, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msArgData = {
    cmd: arg,
    microserviceUuid: microservice.uuid
  }

  await MicroserviceArgManager.create(msArgData, transaction)
  await _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, false, transaction)
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

async function deletePortMappingEndPoint (microserviceUuid, internalPort, user, isCLI, transaction) {
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

async function listPortMappingsEndPoint (microserviceUuid, user, isCLI, transaction) {
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

async function getReceiverMicroservices (microservice, transaction) {
  const routes = await RoutingManager.findAll({ sourceMicroserviceUuid: microservice.uuid }, transaction)

  return routes.map(route => route.destMicroserviceUuid)
}

async function isMicroserviceConsumer (microservice, transaction) {
  const routes = await RoutingManager.findAll({ destMicroserviceUuid: microservice.uuid }, transaction)

  return !!(routes && routes.length > 0)
}

async function createVolumeMappingEndPoint (microserviceUuid, volumeMappingData, user, isCLI, transaction) {
  await Validator.validate(volumeMappingData, Validator.schemas.volumeMappings)

  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid, userId: user.id }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volumeMapping = await VolumeMappingManager.findOne({
    microserviceUuid: microserviceUuid,
    hostDestination: volumeMappingData.hostDestination,
    containerDestination: volumeMappingData.containerDestination
  }, transaction)
  if (volumeMapping) {
    throw new Errors.ValidationError(ErrorMessages.VOLUME_MAPPING_ALREADY_EXISTS)
  }

  const volumeMappingObj = {
    microserviceUuid: microserviceUuid,
    hostDestination: volumeMappingData.hostDestination,
    containerDestination: volumeMappingData.containerDestination,
    accessMode: volumeMappingData.accessMode
  }

  return VolumeMappingManager.create(volumeMappingObj, transaction)
}

async function deleteVolumeMappingEndPoint (microserviceUuid, volumeMappingUuid, user, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid, userId: user.id }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volumeMappingWhere = {
    uuid: volumeMappingUuid,
    microserviceUuid: microserviceUuid
  }

  const affectedRows = await VolumeMappingManager.delete(volumeMappingWhere, transaction)
  if (affectedRows === 0) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_VOLUME_MAPPING_UUID, volumeMappingUuid))
  }
}

async function listVolumeMappingsEndPoint (microserviceUuid, user, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid, userId: user.id }
  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volumeMappingWhere = {
    microserviceUuid: microserviceUuid
  }
  return VolumeMappingManager.findAll(volumeMappingWhere, transaction)
}

// this function works with escape and unescape config, in case of unescaped config, the first split will not work,
// but the second will work
function _validateMicroserviceConfig (config) {
  let result
  if (config) {
    result = config.split('\\"').join('"').split('"').join('\"') // eslint-disable-line no-useless-escape
  }
  return result
}

async function _createMicroservice (microserviceData, user, isCLI, transaction) {
  const config = _validateMicroserviceConfig(microserviceData.config)

  let newMicroservice = {
    uuid: AppHelper.generateRandomString(32),
    name: microserviceData.name,
    config: config,
    catalogItemId: microserviceData.catalogItemId,
    flowId: microserviceData.flowId,
    iofogUuid: microserviceData.iofogUuid,
    rootHostAccess: microserviceData.rootHostAccess,
    registryId: microserviceData.registryId || 1,
    logSize: (microserviceData.logLimit || 50) * 1,
    userId: user.id
  }

  newMicroservice = AppHelper.deleteUndefinedFields(newMicroservice)

  if (newMicroservice.registryId) {
    const registry = await RegistryManager.findOne({ id: newMicroservice.registryId }, transaction)
    if (!registry) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, newMicroservice.registryId))
    }
  }

  await _checkForDuplicateName(newMicroservice.name, {}, user.id, transaction)

  // validate flow
  await _validateFlow(newMicroservice.flowId, user, isCLI, transaction)
  // validate fog node
  if (newMicroservice.iofogUuid) {
    const fog = await FogManager.findOne({ uuid: newMicroservice.iofogUuid }, transaction)
    if (!fog || fog.length === 0) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, newMicroservice.iofogUuid))
    }
  }

  return MicroserviceManager.create(newMicroservice, transaction)
}

async function _validateFlow (flowId, user, isCLI, transaction) {
  const where = isCLI
    ? { id: flowId }
    : { id: flowId, userId: user.id }

  const flow = await FlowManager.findOne(where, transaction)
  if (!flow) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, flowId))
  }
}

async function _createMicroserviceStatus (microservice, transaction) {
  return MicroserviceStatusManager.create({
    microserviceUuid: microservice.uuid
  }, transaction)
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

async function _createVolumeMappings (microservice, volumeMappings, transaction) {
  const mappings = []
  for (const volumeMapping of volumeMappings) {
    const mapping = Object.assign({}, volumeMapping)
    mapping.microserviceUuid = microservice.uuid
    mappings.push(mapping)
  }

  await VolumeMappingManager.bulkCreate(mappings, transaction)
}

async function _createRoutes (sourceMicroservice, destMsUuidArr, user, isCLI, transaction) {
  for (const destUuid of destMsUuidArr) {
    const destWhere = isCLI
      ? { uuid: destUuid }
      : { uuid: destUuid, userId: user.id }

    const destMicroservice = await MicroserviceManager.findOne(destWhere, transaction)
    if (!destMicroservice) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_DEST_MICROSERVICE_UUID, destUuid))
    }

    await _createRoute(sourceMicroservice, destMicroservice, user, transaction)
  }
}

async function _updateVolumeMappings (volumeMappings, microserviceUuid, transaction) {
  await VolumeMappingManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  for (const volumeMapping of volumeMappings) {
    const volumeMappingObj = {
      microserviceUuid: microserviceUuid,
      hostDestination: volumeMapping.hostDestination,
      containerDestination: volumeMapping.containerDestination,
      accessMode: volumeMapping.accessMode
    }

    await VolumeMappingManager.create(volumeMappingObj, transaction)
  }
}

async function _updateImages (images, microserviceUuid, transaction) {
  await CatalogItemImageManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  return _createMicroserviceImages({ uuid: microserviceUuid }, images, transaction)
}

async function _deleteImages (microserviceUuid, transaction) {
  await CatalogItemImageManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
}

async function _updateEnv (env, microserviceUuid, transaction) {
  await MicroserviceEnvManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  for (const envData of env) {
    const envObj = {
      microserviceUuid: microserviceUuid,
      key: envData.key,
      value: envData.value
    }

    await MicroserviceEnvManager.create(envObj, transaction)
  }
}

async function _updateArg (arg, microserviceUuid, transaction) {
  await MicroserviceArgManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction)
  for (const argData of arg) {
    const envObj = {
      microserviceUuid: microserviceUuid,
      cmd: argData
    }

    await MicroserviceArgManager.create(envObj, transaction)
  }
}

async function _updateChangeTracking (configUpdated, fogNodeUuid, transaction) {
  if (configUpdated) {
    await ChangeTrackingService.update(fogNodeUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  } else {
    await ChangeTrackingService.update(fogNodeUuid, ChangeTrackingService.events.microserviceList, transaction)
  }
}

async function _checkForDuplicateName (name, item, userId, transaction) {
  if (name) {
    const where = item.id
      ? {
        name: name,
        uuid: { [Op.ne]: item.id },
        delete: false,
        userId: userId
      }
      : {
        name: name,
        userId: userId,
        delete: false
      }

    const result = await MicroserviceManager.findOne(where, transaction)
    if (result) {
      throw new Errors.DuplicatePropertyError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, name))
    }
  }
}

async function _validateMicroserviceOnGet (userId, microserviceUuid, transaction) {
  const where = {
    '$flow.user.id$': userId,
    'uuid': microserviceUuid
  }
  const microservice = await MicroserviceManager.findMicroserviceOnGet(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_MICROSERVICE_USER)
  }
}

async function _createSimpleRoute (sourceMicroservice, destMicroservice, transaction) {
  // create new route
  const routeData = {
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid
  }

  await RoutingManager.create(routeData, transaction)
  await _switchOnUpdateFlagsForMicroservicesInRoute(sourceMicroservice, destMicroservice, transaction)
}

async function _switchOnUpdateFlagsForMicroservicesInRoute (sourceMicroservice, destMicroservice, transaction) {
  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({ uuid: sourceMicroservice.uuid }, updateRebuildMs, transaction)
  await MicroserviceManager.update({ uuid: destMicroservice.uuid }, updateRebuildMs, transaction)

  await ChangeTrackingService.update(sourceMicroservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  await ChangeTrackingService.update(destMicroservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
}

async function _deleteSimpleRoute (route, transaction) {
  await RoutingManager.delete({ id: route.id }, transaction)

  const sourceMsvc = await MicroserviceManager.findOne({ uuid: route.sourceMicroserviceUuid }, transaction)
  const destMsvc = await MicroserviceManager.findOne({ uuid: route.destMicroserviceUuid }, transaction)

  await ChangeTrackingService.update(sourceMsvc.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  await ChangeTrackingService.update(destMsvc.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
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
  await _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, false, transaction)
}

async function _switchOnUpdateFlagsForMicroservicesForPortMapping (microservice, isPublic, transaction) {
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
      await _buildPublicPortMapping(portMappingResponseData, msvcPublicPort, transaction)
    }
    res.push(portMappingResponseData)
  }
  return res
}

async function _getLogicalRoutesByMicroservice (microserviceUuid, transaction) {
  const res = []
  const query = {
    [Op.or]:
      [
        {
          sourceMicroserviceUuid: microserviceUuid
        },
        {
          destMicroserviceUuid: microserviceUuid
        }
      ]
  }
  const routes = await RoutingManager.findAll(query, transaction)
  for (const route of routes) {
    if (route.sourceMicroserviceUuid && route.destMicroserviceUuid) {
      res.push(route)
    }
  }
  return res
}

async function deleteMicroserviceWithRoutesAndPortMappings (microservice, transaction) {
  const routes = await _getLogicalRoutesByMicroservice(microservice.uuid, transaction)
  for (const route of routes) {
    await _deleteSimpleRoute(route, transaction)
  }

  const portMappings = await MicroservicePortManager.findAll({ microserviceUuid: microservice.uuid }, transaction)
  for (const ports of portMappings) {
    const user = {
      id: microservice.userId
    }
    await _deletePortMapping(microservice, ports, user, transaction)
  }
  await MicroserviceManager.delete({
    uuid: microservice.uuid
  }, transaction)
}

function _buildLink (protocol, ip, port) {
  return `${protocol || 'http'}://${ip}:${port}`
}

async function _buildGetMicroserviceResponse (microservice, transaction) {
  const microserviceUuid = microservice.uuid

  // get additional data
  const portMappings = await MicroservicePortManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
  const images = await CatalogItemImageManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
  const volumeMappings = await VolumeMappingManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
  const routes = await RoutingManager.findAll({ sourceMicroserviceUuid: microserviceUuid }, transaction)
  const env = await MicroserviceEnvManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const cmd = await MicroserviceArgManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const arg = cmd.map((it) => it.cmd)
  const status = await MicroserviceStatusManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)

  // build microservice response
  const res = Object.assign({}, microservice.dataValues)
  res.ports = []
  for (const pm of portMappings) {
    const mapping = { internal: pm.portInternal, external: pm.portExternal, publicMode: pm.isPublic }
    if (pm.isPublic) {
      const publicPortMapping = await pm.getPublicPort()
      if (publicPortMapping) {
        await _buildPublicPortMapping(mapping, publicPortMapping, transaction)
      }
    }
    res.ports.push(mapping)
  }
  res.volumeMappings = volumeMappings.map((vm) => vm.dataValues)
  res.routes = routes.map((r) => r.destMicroserviceUuid)
  res.env = env
  res.cmd = arg
  res.images = images.map(i => ({ containerImage: i.containerImage, fogTypeId: i.fogTypeId }))
  if (status && status.length) {
    res.status = status[0]
  }

  res.logSize *= 1

  return res
}

async function _buildPublicPortMapping (mapping, publicPortMapping, transaction) {
  const hostRouter = publicPortMapping.hostId ? await RouterManager.findOne({ iofogUuid: publicPortMapping.hostId }, transaction) : { host: lget(await ConfigManager.findOne({ key: DEFAULT_PROXY_HOST }, transaction), 'value', 'undefined-proxy-host') }
  const hostFog = publicPortMapping.hostId ? await FogManager.findOne({ uuid: publicPortMapping.hostId }, transaction) : { uuid: DEFAULT_ROUTER_NAME }
  mapping.publicLink = _buildLink(publicPortMapping.protocol, hostRouter.host, publicPortMapping.publicPort)
  mapping.publicPort = publicPortMapping.publicPort
  mapping.host = hostFog.isSystem ? DEFAULT_ROUTER_NAME : hostFog.uuid
  mapping.protocol = publicPortMapping.protocol
}

function listAllPublicPortsEndPoint (user, transaction) {
  return MicroservicePortManager.findAllPublicPorts(transaction)
}

// decorated functions
const createMicroserviceWithTracking = TrackingDecorator.trackEvent(createMicroserviceEndPoint,
  TrackingEventType.MICROSERVICE_CREATED)

module.exports = {
  createMicroserviceEndPoint: TransactionDecorator.generateTransaction(createMicroserviceWithTracking),
  createPortMappingEndPoint: TransactionDecorator.generateTransaction(createPortMappingEndPoint),
  createRouteEndPoint: TransactionDecorator.generateTransaction(createRouteEndPoint),
  createVolumeMappingEndPoint: TransactionDecorator.generateTransaction(createVolumeMappingEndPoint),
  deleteMicroserviceEndPoint: TransactionDecorator.generateTransaction(deleteMicroserviceEndPoint),
  deleteMicroserviceWithRoutesAndPortMappings: deleteMicroserviceWithRoutesAndPortMappings,
  deleteNotRunningMicroservices: deleteNotRunningMicroservices,
  deletePortMappingEndPoint: TransactionDecorator.generateTransaction(deletePortMappingEndPoint),
  deleteRouteEndPoint: TransactionDecorator.generateTransaction(deleteRouteEndPoint),
  deleteVolumeMappingEndPoint: TransactionDecorator.generateTransaction(deleteVolumeMappingEndPoint),
  getMicroserviceEndPoint: TransactionDecorator.generateTransaction(getMicroserviceEndPoint),
  getReceiverMicroservices,
  isMicroserviceConsumer,
  listAllPublicPortsEndPoint: TransactionDecorator.generateTransaction(listAllPublicPortsEndPoint),
  listMicroservicePortMappingsEndPoint: TransactionDecorator.generateTransaction(listPortMappingsEndPoint),
  listMicroservicesEndPoint: TransactionDecorator.generateTransaction(listMicroservicesEndPoint),
  listVolumeMappingsEndPoint: TransactionDecorator.generateTransaction(listVolumeMappingsEndPoint),
  updateMicroserviceEndPoint: TransactionDecorator.generateTransaction(updateMicroserviceEndPoint)
}
