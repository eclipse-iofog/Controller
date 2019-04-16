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

const logger = require('../logger')
const TransactionDecorator = require('../decorators/transaction-decorator')
const MicroserviceManager = require('../sequelize/managers/microservice-manager')
const MicroserviceStatusManager = require('../sequelize/managers/microservice-status-manager')
const MicroserviceArgManager = require('../sequelize/managers/microservice-arg-manager')
const MicroserviceEnvManager = require('../sequelize/managers/microservice-env-manager')
const MicroservicePortManager = require('../sequelize/managers/microservice-port-manager')
const MicroserviceStates = require('../enums/microservice-state')
const VolumeMappingManager = require('../sequelize/managers/volume-mapping-manager')
const ConnectorManager = require('../sequelize/managers/connector-manager')
const ConnectorPortManager = require('../sequelize/managers/connector-port-manager')
const MicroservicePublicModeManager = require('../sequelize/managers/microservice-public-mode-manager')
const ChangeTrackingService = require('./change-tracking-service')
const ConnectorPortService = require('./connector-port-service')
const IoFogService = require('../services/iofog-service')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const Validator = require('../schemas/index')
const FlowService = require('../services/flow-service')
const CatalogService = require('../services/catalog-service')
const RoutingManager = require('../sequelize/managers/routing-manager')
const Op = require('sequelize').Op
const fs = require('fs')
const _ = require('underscore')
const TrackingDecorator = require('../decorators/tracking-decorator')
const TrackingEventType = require('../enums/tracking-event-type')

async function listMicroservicesEndPoint(flowId, user, isCLI, transaction) {
  if (!isCLI) {
    await FlowService.getFlow(flowId, user, isCLI, transaction)
  }
  const where = isCLI ? { delete: false } : { flowId: flowId, delete: false }

  const microservices = await MicroserviceManager.findAllExcludeFields(where, transaction)

  const res = await Promise.all(microservices.map(async (microservice) => {
    return _buildGetMicroserviceResponse(microservice, transaction)
  }))
  return {
    microservices: res,
  }
}

async function getMicroserviceEndPoint(microserviceUuid, user, isCLI, transaction) {
  if (!isCLI) {
    await _validateMicroserviceOnGet(user.id, microserviceUuid, transaction)
  }

  const microservice = await MicroserviceManager.findOneExcludeFields({
    uuid: microserviceUuid, delete: false,
  }, transaction)

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  return await _buildGetMicroserviceResponse(microservice, transaction)
}

async function createMicroserviceEndPoint(microserviceData, user, isCLI, transaction) {
  await Validator.validate(microserviceData, Validator.schemas.microserviceCreate)

  const microservice = await _createMicroservice(microserviceData, user, isCLI, transaction)

  if (microserviceData.ports) {
    for (const mapping of microserviceData.ports) {
      await _createPortMapping(microservice, mapping, user, transaction)
    }
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

  return {
    uuid: microservice.uuid,
  }
}

async function updateMicroserviceEndPoint(microserviceUuid, microserviceData, user, isCLI, transaction) {
  await Validator.validate(microserviceData, Validator.schemas.microserviceUpdate)

  const query = isCLI
    ?
    {
      uuid: microserviceUuid,
    }
    :
    {
      uuid: microserviceUuid,
      userId: user.id,
    }

  const config = _validateMicroserviceConfig(microserviceData.config)

  const microserviceToUpdate = {
    name: microserviceData.name,
    config: config,
    rebuild: microserviceData.rebuild,
    iofogUuid: microserviceData.iofogUuid,
    rootHostAccess: microserviceData.rootHostAccess,
    logSize: microserviceData.logLimit,
    volumeMappings: microserviceData.volumeMappings,
    env: microserviceData.env,
    cmd: microserviceData.cmd,
  }

  const microserviceDataUpdate = AppHelper.deleteUndefinedFields(microserviceToUpdate)

  const microservice = await MicroserviceManager.findOneWithCategory(query, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  if (microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_UPDATE, microserviceUuid))
  }

  if (microserviceDataUpdate.name) {
    const userId = isCLI ? microservice.userId : user.id
    await _checkForDuplicateName(microserviceDataUpdate.name, { id: microserviceUuid }, userId, transaction)
  }

  // validate fog node
  if (microserviceDataUpdate.iofogUuid) {
    await IoFogService.getFog({ uuid: microserviceDataUpdate.iofogUuid }, user, isCLI, transaction)
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
    await _moveRoutesToNewFog(updatedMicroservice, microservice.iofogUuid, user, transaction)
    await _movePublicModesToNewFog(updatedMicroservice, microservice.iofogUuid, user, transaction)
  }

  // update change tracking for new fog
  await _updateChangeTracking(!!microserviceData.config, microserviceDataUpdate.iofogUuid, transaction)
}

async function _moveRoutesToNewFog(microservice, oldFogUuid, user, transaction) {
  const routes = await _getLogicalNetworkRoutesByMicroservice(microservice.uuid, transaction)

  for (const route of routes.sourceRoutes) {
    const sourceWhere = { uuid: route.sourceMicroserviceUuid, userId: user.id }
    const sourceMicroservice = await MicroserviceManager.findOne(sourceWhere, transaction)

    await _recreateRoute(route, sourceMicroservice, microservice, user, transaction)
    await _updateChangeTracking(false, route.sourceIofogUuid, transaction)
  }

  for (const route of routes.destRoutes) {
    const destWhere = { uuid: route.destMicroserviceUuid, userId: user.id }
    const destMicroservice = await MicroserviceManager.findOne(destWhere, transaction)

    await _recreateRoute(route, microservice, destMicroservice, user, transaction)
    await _updateChangeTracking(false, route.destIofogUuid, transaction)
  }

  // update change tracking for old fog
  await _updateChangeTracking(false, oldFogUuid, transaction)
}

async function _movePublicModesToNewFog(microservice, oldIofogUuid, user, transaction) {
  const publicModes = await _getPublicModesByMicroservice(microservice.uuid, transaction)

  for (const pub of publicModes) {
    await _recreatePublicMode(microservice, pub, user, transaction)
    await _updateChangeTracking(false, pub.iofogUuid, transaction)
  }

  // update change tracking for old fog
  await _updateChangeTracking(false, oldIofogUuid, transaction)
}

async function deleteMicroserviceEndPoint(microserviceUuid, microserviceData, user, isCLI, transaction) {
  const where = isCLI
    ?
    {
      uuid: microserviceUuid,
    }
    :
    {
      uuid: microserviceUuid,
      userId: user.id,
    }

  const microservice = await MicroserviceManager.findOneWithStatusAndCategory(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (!isCLI && microservice.catalogItem.category === 'SYSTEM') {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SYSTEM_MICROSERVICE_DELETE, microserviceUuid))
  }

  if (!microservice.microserviceStatus || microservice.microserviceStatus.status === MicroserviceStates.NOT_RUNNING) {
    await deleteMicroserviceWithRoutesAndPortMappings(microservice, transaction)
  } else {
    await MicroserviceManager.update({
      uuid: microserviceUuid,
    },
    {
      delete: true,
      deleteWithCleanUp: !!microserviceData.withCleanup,
    }, transaction)
  }

  await _updateChangeTracking(false, microservice.iofogUuid, transaction)
}

async function deleteNotRunningMicroservices(fog, transaction) {
  const microservices = await MicroserviceManager.findAllWithStatuses({ iofogUuid: fog.uuid }, transaction)
  microservices
      .filter((microservice) => microservice.delete)
      .filter((microservice) => microservice.microserviceStatus.status === MicroserviceStates.NOT_RUNNING)
      .forEach(async (microservice) => await deleteMicroserviceWithRoutesAndPortMappings(microservice, transaction))
}

async function createRouteEndPoint(sourceMicroserviceUuid, destMicroserviceUuid, user, isCLI, transaction) {
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

async function _createRoute(sourceMicroservice, destMicroservice, user, transaction) {
  if (!sourceMicroservice.iofogUuid || !destMicroservice.iofogUuid) {
    throw new Errors.ValidationError('fog not set')
  }
  if (sourceMicroservice.flowId !== destMicroservice.flowId) {
    throw new Errors.ValidationError('microservices on different flows')
  }

  const route = await RoutingManager.findOne({
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid,
  }, transaction)
  if (route) {
    throw new Errors.ValidationError('route already exists')
  }

  if (sourceMicroservice.iofogUuid === destMicroservice.iofogUuid) {
    await _createSimpleRoute(sourceMicroservice, destMicroservice, transaction)
  } else {
    await _createRouteOverConnector(sourceMicroservice, destMicroservice, user, transaction)
  }
}

async function updateRouteOverConnector(connector, transaction) {
  const routes = await RoutingManager.findAllRoutesByConnectorId(connector.id, transaction)
  const networkMicroserviceUuids = _.flatten(_.map(
      routes, (route) => [route.sourceNetworkMicroserviceUuid, route.destNetworkMicroserviceUuid]
  ))
  await _updateNetworkMicroserviceConfigs(networkMicroserviceUuids, connector, transaction)
}

async function deleteRouteEndPoint(sourceMicroserviceUuid, destMicroserviceUuid, user, isCLI, transaction) {
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
    destMicroserviceUuid: destMicroserviceUuid,
  }, transaction)
  if (!route) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.ROUTE_NOT_FOUND))
  }

  await _deleteRoute(route, transaction)
}

async function _deleteRoute(route, transaction) {
  if (route.isNetworkConnection) {
    await _deleteRouteOverConnector(route, transaction)
  } else {
    await _deleteSimpleRoute(route, transaction)
  }
}

async function createPortMappingEndPoint(microserviceUuid, portMappingData, user, isCLI, transaction) {
  await Validator.validate(portMappingData, Validator.schemas.portsCreate)
  await _validatePorts(portMappingData.internal, portMappingData.external)

  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid, userId: user.id }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  return _createPortMapping(microservice, portMappingData, user, transaction)
}

async function _createPortMapping(microservice, portMappingData, user, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msPorts = await MicroservicePortManager.findOne({
    microserviceUuid: microservice.uuid,
    [Op.or]:
      [
        {
          portInternal: portMappingData.internal,
        },
        {
          portExternal: portMappingData.external,
        },
      ],
  }, transaction)
  if (msPorts) {
    throw new Errors.ValidationError(ErrorMessages.PORT_MAPPING_ALREADY_EXISTS)
  }

  if (portMappingData.publicMode) {
    return await _createPortMappingOverConnector(microservice, portMappingData, user, transaction)
  } else {
    return await _createSimplePortMapping(microservice, portMappingData, user, transaction)
  }
}

async function _createEnv(microservice, envData, user, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msEnvData = {
    key: envData.key,
    value: envData.value,
    userId: microservice.userId,
    microserviceUuid: microservice.uuid,
  }

  await MicroserviceEnvManager.create(msEnvData, transaction)
  await _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, false, transaction)
}

async function _createArg(microservice, arg, user, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msArgData = {
    cmd: arg,
    microserviceUuid: microservice.uuid,
  }

  await MicroserviceArgManager.create(msArgData, transaction)
  await _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, false, transaction)
}

async function updatePortMappingOverConnector(connector, transaction) {
  const microservicePublicModes = await MicroservicePublicModeManager.findAllMicroservicePublicModesByConnectorId(connector.id,
      transaction)
  const networkMicroserviceUuids = microservicePublicModes.map((obj) => obj.networkMicroserviceUuid)
  await _updateNetworkMicroserviceConfigs(networkMicroserviceUuids, connector, transaction)
}

async function _deletePortMapping(microservice, portMapping, user, transaction) {
  if (portMapping.isPublic) {
    await _deletePortMappingOverConnector(microservice, portMapping, user, transaction)
  } else {
    await _deleteSimplePortMapping(microservice, portMapping, user, transaction)
  }
}

async function deletePortMappingEndPoint(microserviceUuid, internalPort, user, isCLI, transaction) {
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
    portInternal: internalPort,
  }, transaction)
  if (!msPorts) {
    throw new Errors.NotFoundError('port mapping not exists')
  }

  await _deletePortMapping(microservice, msPorts, user, transaction)
}

async function listPortMappingsEndPoint(microserviceUuid, user, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid, userId: user.id }
  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const portsPairs = await MicroservicePortManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
  return await _buildPortsList(portsPairs, transaction)
}

async function getPhysicalConnections(microservice, transaction) {
  const res = []
  const pubModes = await MicroservicePublicModeManager.findAll({ microserviceUuid: microservice.uuid }, transaction)
  for (const pm of pubModes) {
    res.push(pm.networkMicroserviceUuid)
  }

  const sourceRoutes = await RoutingManager.findAll({ sourceMicroserviceUuid: microservice.uuid }, transaction)
  for (const sr of sourceRoutes) {
    if (!sr.sourceIofogUuid || !sr.destIofogUuid) {
      continue
    } else if (sr.sourceIofogUuid === sr.destIofogUuid) {
      res.push(sr.destMicroserviceUuid)
    } else if (sr.sourceIofogUuid !== sr.destIofogUuid) {
      res.push(sr.sourceNetworkMicroserviceUuid)
    }
  }

  const netwRoutes = await RoutingManager.findAll({ destNetworkMicroserviceUuid: microservice.uuid }, transaction)
  for (const nr of netwRoutes) {
    res.push(nr.destMicroserviceUuid)
  }

  return res
}

async function createVolumeMappingEndPoint(microserviceUuid, volumeMappingData, user, isCLI, transaction) {
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
    containerDestination: volumeMappingData.containerDestination,
  }, transaction)
  if (volumeMapping) {
    throw new Errors.ValidationError(ErrorMessages.VOLUME_MAPPING_ALREADY_EXISTS)
  }

  const volumeMappingObj = {
    microserviceUuid: microserviceUuid,
    hostDestination: volumeMappingData.hostDestination,
    containerDestination: volumeMappingData.containerDestination,
    accessMode: volumeMappingData.accessMode,
  }

  return await VolumeMappingManager.create(volumeMappingObj, transaction)
}

async function deleteVolumeMappingEndPoint(microserviceUuid, volumeMappingUuid, user, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid, userId: user.id }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volumeMappingWhere = {
    uuid: volumeMappingUuid,
    microserviceUuid: microserviceUuid,
  }

  const affectedRows = await VolumeMappingManager.delete(volumeMappingWhere, transaction)
  if (affectedRows === 0) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_VOLUME_MAPPING_UUID, volumeMappingUuid))
  }
}

async function listVolumeMappingsEndPoint(microserviceUuid, user, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid, userId: user.id }
  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volumeMappingWhere = {
    microserviceUuid: microserviceUuid,
  }
  return await VolumeMappingManager.findAll(volumeMappingWhere, transaction)
}

// this function works with escape and unescape config, in case of unescaped config, the first split will not work,
// but the second will work
function _validateMicroserviceConfig(config) {
  let result
  if (config) {
    result = config.split('\\"').join('"').split('"').join('\"')
  }
  return result
}

async function _createMicroservice(microserviceData, user, isCLI, transaction) {
  const config = _validateMicroserviceConfig(microserviceData.config)

  let newMicroservice = {
    uuid: AppHelper.generateRandomString(32),
    name: microserviceData.name,
    config: config,
    catalogItemId: microserviceData.catalogItemId,
    flowId: microserviceData.flowId,
    iofogUuid: microserviceData.iofogUuid,
    rootHostAccess: microserviceData.rootHostAccess,
    logSize: microserviceData.logLimit,
    userId: user.id,
  }

  newMicroservice = AppHelper.deleteUndefinedFields(newMicroservice)

  await _checkForDuplicateName(newMicroservice.name, {}, user.id, transaction)

  // validate catalog item
  await CatalogService.getCatalogItem(newMicroservice.catalogItemId, user, isCLI, transaction)
  // validate flow
  await FlowService.getFlow(newMicroservice.flowId, user, isCLI, transaction)
  // validate fog node
  if (newMicroservice.iofogUuid) {
    await IoFogService.getFog({ uuid: newMicroservice.iofogUuid }, user, isCLI, transaction)
  }

  return await MicroserviceManager.create(newMicroservice, transaction)
}

async function _createMicroserviceStatus(microservice, transaction) {
  return await MicroserviceStatusManager.create({
    microserviceUuid: microservice.uuid,
  }, transaction)
}

async function _createVolumeMappings(microservice, volumeMappings, transaction) {
  const mappings = []
  for (const volumeMapping of volumeMappings) {
    const mapping = Object.assign({}, volumeMapping)
    mapping.microserviceUuid = microservice.uuid
    mappings.push(mapping)
  }

  await VolumeMappingManager.bulkCreate(mappings, transaction)
}

async function _createRoutes(sourceMicroservice, destMsUuidArr, user, isCLI, transaction) {
  for (const destUuid of destMsUuidArr) {
    const destWhere = isCLI
      ? { uuid: destUuid }
      : { uuid: destUuid, userId: user.id }

    const destMicroservice = await MicroserviceManager.findOne(destWhere, transaction)
    if (!destMicroservice) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_DEST_MICROSERVICE_UUID, destMicroserviceUuid))
    }

    await _createRoute(sourceMicroservice, destMicroservice, user, transaction)
  }
}

async function _updateVolumeMappings(volumeMappings, microserviceUuid, transaction) {
  await VolumeMappingManager.delete({
    microserviceUuid: microserviceUuid,
  }, transaction)
  for (const volumeMapping of volumeMappings) {
    const volumeMappingObj = {
      microserviceUuid: microserviceUuid,
      hostDestination: volumeMapping.hostDestination,
      containerDestination: volumeMapping.containerDestination,
      accessMode: volumeMapping.accessMode,
    }

    await VolumeMappingManager.create(volumeMappingObj, transaction)
  }
}

async function _updateEnv(env, microserviceUuid, transaction) {
  await MicroserviceEnvManager.delete({
    microserviceUuid: microserviceUuid,
  }, transaction)
  for (const envData of env) {
    const envObj = {
      microserviceUuid: microserviceUuid,
      key: envData.key,
      value: envData.value,
    }

    await MicroserviceEnvManager.create(envObj, transaction)
  }
}

async function _updateArg(arg, microserviceUuid, transaction) {
  await MicroserviceArgManager.delete({
    microserviceUuid: microserviceUuid,
  }, transaction)
  for (const argData of arg) {
    const envObj = {
      microserviceUuid: microserviceUuid,
      cmd: argData,
    }

    await MicroserviceArgManager.create(envObj, transaction)
  }
}

async function _updateChangeTracking(configUpdated, fogNodeUuid, transaction) {
  if (configUpdated) {
    await ChangeTrackingService.update(fogNodeUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  } else {
    await ChangeTrackingService.update(fogNodeUuid, ChangeTrackingService.events.microserviceList, transaction)
  }
}

async function _checkForDuplicateName(name, item, userId, transaction) {
  if (name) {
    const where = item.id
      ?
      {
        name: name,
        uuid: { [Op.ne]: item.id },
        userId: userId,
      }
      :
      {
        name: name,
        userId: userId,
      }

    const result = await MicroserviceManager.findOne(where, transaction)
    if (result) {
      throw new Errors.DuplicatePropertyError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, name))
    }
  }
}

async function _validateMicroserviceOnGet(userId, microserviceUuid, transaction) {
  const where = {
    '$flow.user.id$': userId,
    'uuid': microserviceUuid,
  }
  const microservice = await MicroserviceManager.findMicroserviceOnGet(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_MICROSERVICE_USER)
  }
}

async function _createSimpleRoute(sourceMicroservice, destMicroservice, transaction) {
  // create new route
  const routeData = {
    isNetworkConnection: false,
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid,
    sourceIofogUuid: sourceMicroservice.iofogUuid,
    destIofogUuid: destMicroservice.iofogUuid, // same as sourceIofogUuid
  }

  await RoutingManager.create(routeData, transaction)
  await _switchOnUpdateFlagsForMicroservicesInRoute(sourceMicroservice, destMicroservice, transaction)
}


async function _updateNetworkMicroserviceConfigs(networkMicroserviceUuids, connector, transaction) {
  const microservices = await MicroserviceManager.findAll({ uuid: networkMicroserviceUuids }, transaction)

  let cert
  if (!connector.devMode && connector.cert) {
    cert = AppHelper.trimCertificate(fs.readFileSync(connector.cert, 'utf-8'))
  }

  for (const microservice of microservices) {
    const msConfig = JSON.parse(microservice.config)
    msConfig.host = connector.domain
    msConfig.cert = cert
    msConfig.devmode = connector.devMode
    const newConfig = {
      config: JSON.stringify(msConfig),
      rebuild: true,
    }
    await MicroserviceManager.update({
      uuid: microservice.uuid,
    }, newConfig, transaction)
  }

  const onlyUnique = (value, index, self) => self.indexOf(value) === index
  const iofogUuids = microservices
      .map((obj) => obj.iofogUuid)
      .filter(onlyUnique)
      .filter((val) => val !== null)

  for (const iofogUuid of iofogUuids) {
    await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  }
}

async function _createRouteOverConnector(sourceMicroservice, destMicroservice, user, transaction) {
  // open connector
  const justOpenedConnectorsPorts = await ConnectorPortService.openPortOnRandomConnector(false, transaction)

  const ports = justOpenedConnectorsPorts.ports
  const connector = justOpenedConnectorsPorts.connector

  const createConnectorPortData = {
    port1: ports.port1,
    port2: ports.port2,
    maxConnectionsPort1: 1,
    maxConnectionsPort2: 1,
    passcodePort1: ports.passcode1,
    passcodePort2: ports.passcode2,
    heartBeatAbsenceThresholdPort1: 60000,
    heartBeatAbsenceThresholdPort2: 60000,
    connectorId: ports.connectorId,
    mappingId: ports.id,
  }
  const connectorPort = await ConnectorPortManager.create(createConnectorPortData, transaction)

  const networkCatalogItem = await CatalogService.getNetworkCatalogItem(transaction)

  let cert
  if (!connector.devMode && connector.cert) {
    cert = AppHelper.trimCertificate(fs.readFileSync(connector.cert, 'utf-8'))
  }

  // create netw ms1
  const sourceNetwMsConfig = {
    'mode': 'private',
    'host': connector.domain,
    'cert': cert,
    'port': ports.port1,
    'passcode': ports.passcode1,
    'connectioncount': 1,
    'localhost': 'iofog',
    'localport': 0,
    'heartbeatfrequency': 20000,
    'heartbeatabsencethreshold': 60000,
    'devmode': connector.devMode,
  }
  const sourceNetworkMicroservice = await _createNetworkMicroserviceForMaster(
      sourceMicroservice,
      sourceNetwMsConfig,
      networkCatalogItem,
      user,
      transaction
  )

  // create netw ms2
  const destNetwMsConfig = {
    'mode': 'private',
    'host': connector.domain,
    'cert': cert,
    'port': ports.port2,
    'passcode': ports.passcode2,
    'connectioncount': 1,
    'localhost': 'iofog',
    'localport': 0,
    'heartbeatfrequency': 20000,
    'heartbeatabsencethreshold': 60000,
    'devmode': connector.devMode,
  }
  const destNetworkMicroservice = await _createNetworkMicroserviceForMaster(
      destMicroservice,
      destNetwMsConfig,
      networkCatalogItem,
      user,
      transaction
  )

  // create new route
  const routeData = {
    isNetworkConnection: true,
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid,
    sourceIofogUuid: sourceMicroservice.iofogUuid,
    destIofogUuid: destMicroservice.iofogUuid,
    sourceNetworkMicroserviceUuid: sourceNetworkMicroservice.uuid,
    destNetworkMicroserviceUuid: destNetworkMicroservice.uuid,
    connectorPortId: connectorPort.id,
  }
  await RoutingManager.create(routeData, transaction)

  await _switchOnUpdateFlagsForMicroservicesInRoute(sourceMicroservice, destMicroservice, transaction)
}

async function _createNetworkMicroserviceForMaster(masterMicroservice, sourceNetwMsConfig, networkCatalogItem, user, transaction) {
  const sourceNetworkMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: `Network for Microservice ${masterMicroservice.uuid}`,
    config: JSON.stringify(sourceNetwMsConfig),
    isNetwork: true,
    catalogItemId: networkCatalogItem.id,
    flowId: masterMicroservice.flowId,
    iofogUuid: masterMicroservice.iofogUuid,
    rootHostAccess: false,
    logSize: 50,
    userId: masterMicroservice.userId,
    configLastUpdated: Date.now(),
  }

  return await MicroserviceManager.create(sourceNetworkMicroserviceData, transaction)
}

async function _switchOnUpdateFlagsForMicroservicesInRoute(sourceMicroservice, destMicroservice, transaction) {
  const updateRebuildMs = {
    rebuild: true,
  }
  await MicroserviceManager.update({ uuid: sourceMicroservice.uuid }, updateRebuildMs, transaction)
  await MicroserviceManager.update({ uuid: destMicroservice.uuid }, updateRebuildMs, transaction)

  await ChangeTrackingService.update(sourceMicroservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  await ChangeTrackingService.update(destMicroservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
}

async function _deleteSimpleRoute(route, transaction) {
  await RoutingManager.delete({ id: route.id }, transaction)

  await ChangeTrackingService.update(route.sourceIofogUuid, ChangeTrackingService.events.microserviceRouting, transaction)
  await ChangeTrackingService.update(route.destIofogUuid, ChangeTrackingService.events.microserviceRouting, transaction)
}

async function _deleteRouteOverConnector(route, transaction) {
  const ports = await ConnectorPortManager.findOne({ id: route.connectorPortId }, transaction)
  const connector = await ConnectorManager.findOne({ id: ports.connectorId }, transaction)

  try {
    await ConnectorPortService.closePortOnConnector(connector, ports)
  } catch (e) {
    logger.warn(`Can't close ports pair ${ports.mappingId} on connector ${connector.publicIp}. Delete manually if necessary`)
  }

  await RoutingManager.delete({ id: route.id }, transaction)
  await ConnectorPortManager.delete({ id: ports.id }, transaction)
  await MicroserviceManager.delete({ uuid: route.sourceNetworkMicroserviceUuid }, transaction)
  await MicroserviceManager.delete({ uuid: route.destNetworkMicroserviceUuid }, transaction)

  await ChangeTrackingService.update(route.sourceIofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  await ChangeTrackingService.update(route.destIofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
}

async function _createSimplePortMapping(microservice, portMappingData, user, transaction) {
  // create port mapping
  const mappingData = {
    isPublic: false,
    portInternal: portMappingData.internal,
    portExternal: portMappingData.external,
    userId: microservice.userId,
    microserviceUuid: microservice.uuid,
  }

  await MicroservicePortManager.create(mappingData, transaction)
  await _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, false, transaction)
}


async function _createPortMappingOverConnector(microservice, portMappingData, user, transaction) {
  // open connector
  const justOpenedConnectorsPorts = await ConnectorPortService.openPortOnRandomConnector(true, transaction)

  const ports = justOpenedConnectorsPorts.ports
  const connector = justOpenedConnectorsPorts.connector

  const createConnectorPortData = {
    port1: ports.port1,
    port2: ports.port2,
    maxConnectionsPort1: 1,
    maxConnectionsPort2: 60,
    passcodePort1: ports.passcode1,
    passcodePort2: ports.passcode2,
    heartBeatAbsenceThresholdPort1: 60000,
    heartBeatAbsenceThresholdPort2: 0,
    connectorId: ports.connectorId,
    mappingId: ports.id,
  }
  const connectorPort = await ConnectorPortManager.create(createConnectorPortData, transaction)

  const networkCatalogItem = await CatalogService.getNetworkCatalogItem(transaction)

  let cert
  if (!connector.devMode && connector.cert) {
    cert = AppHelper.trimCertificate(fs.readFileSync(connector.cert, 'utf-8'))
  }
  // create netw ms1
  const netwMsConfig = {
    'mode': 'public',
    'host': connector.domain,
    'cert': cert,
    'port': ports.port1,
    'passcode': ports.passcode1,
    'connectioncount': 60,
    'localhost': 'iofog',
    'localport': portMappingData.external,
    'heartbeatfrequency': 20000,
    'heartbeatabsencethreshold': 60000,
    'devmode': connector.devMode,
  }
  const networkMicroservice = await _createNetworkMicroserviceForMaster(
      microservice,
      netwMsConfig,
      networkCatalogItem,
      user,
      transaction
  )

  // create public port mapping
  const mappingData = {
    isPublic: true,
    portInternal: portMappingData.internal,
    portExternal: portMappingData.external,
    userId: microservice.userId,
    microserviceUuid: microservice.uuid,
  }

  const msPortMapping = await MicroservicePortManager.create(mappingData, transaction)

  const msPubModeData = {
    microserviceUuid: microservice.uuid,
    networkMicroserviceUuid: networkMicroservice.uuid,
    iofogUuid: microservice.iofogUuid,
    microservicePortId: msPortMapping.id,
    connectorPortId: connectorPort.id,
  }
  await MicroservicePublicModeManager.create(msPubModeData, transaction)


  await _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, true, transaction)
  const publicLink = await _buildLink(connector.devMode ? 'http' : 'https', connector.publicIp, connectorPort.port2)
  return { publicLink: publicLink }
}

async function _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, isPublic, transaction) {
  const updateRebuildMs = {
    rebuild: true,
  }
  await MicroserviceManager.update({ uuid: microservice.uuid }, updateRebuildMs, transaction)

  if (isPublic) {
    await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  } else {
    await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
  }
}


async function _deleteSimplePortMapping(microservice, msPorts, user, transaction) {
  await MicroservicePortManager.delete({ id: msPorts.id }, transaction)

  const updateRebuildMs = {
    rebuild: true,
  }
  await MicroserviceManager.update({ uuid: microservice.uuid }, updateRebuildMs, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
}

async function _deletePortMappingOverConnector(microservice, msPorts, user, transaction) {
  const pubModeData = await MicroservicePublicModeManager.findOne({ microservicePortId: msPorts.id }, transaction)

  const ports = await ConnectorPortManager.findOne({ id: pubModeData.connectorPortId }, transaction)
  const connector = await ConnectorManager.findOne({ id: ports.connectorId }, transaction)

  try {
    await ConnectorPortService.closePortOnConnector(connector, ports)
  } catch (e) {
    logger.warn(`Can't close ports pair ${ports.mappingId} on connector ${connector.publicIp}. Delete manually if necessary`)
  }
  await MicroservicePublicModeManager.delete({ id: pubModeData.id }, transaction)
  await MicroservicePortManager.delete({ id: msPorts.id }, transaction)
  await ConnectorPortManager.delete({ id: ports.id }, transaction)
  await MicroserviceManager.delete({ uuid: pubModeData.networkMicroserviceUuid }, transaction)

  const updateRebuildMs = {
    rebuild: true,
  }
  await MicroserviceManager.update({ uuid: microservice.uuid }, updateRebuildMs, transaction)

  await ChangeTrackingService.update(pubModeData.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
}

async function _validatePorts(internal, external) {
  if (internal <= 0 || internal > 65535
    || external <= 0 || external > 65535
    // TODO find this ports in project. check is possible to delete some of them
    || external === 60400 || external === 60401 || external === 10500 || external === 54321 || external === 55555) {
    throw new Errors.ValidationError('Incorrect port')
  }
}

async function _buildPortsList(portsPairs, transaction) {
  const res = []
  for (const ports of portsPairs) {
    const portMappingResposeData = {
      internal: ports.portInternal,
      external: ports.portExternal,
      publicMode: ports.isPublic,
    }
    if (ports.isPublic) {
      const pubMode = await MicroservicePublicModeManager.findOne({ microservicePortId: ports.id }, transaction)
      const connectorPorts = await ConnectorPortManager.findOne({ id: pubMode.connectorPortId }, transaction)
      const connector = await ConnectorManager.findOne({ id: connectorPorts.connectorId }, transaction)

      portMappingResposeData.publicLink = await _buildLink(connector.devMode ? 'http' : 'https',
          connector.publicIp, connectorPorts.port2)
    }
    res.push(portMappingResposeData)
  }
  return res
}

/**
 * Get all microservices that connected (as source or destination) to microservice using network connection
 *
 * @param {string} microserviceUuid
 * @param {Transaction} transaction
 * @return {Promise<{sourceRoutes: Array, destRoutes: Array}>}
 * @private
 */
async function _getLogicalNetworkRoutesByMicroservice(microserviceUuid, transaction) {
  const res = {
    sourceRoutes: [],
    destRoutes: [],
  }
  const query = {
    [Op.or]:
      [
        {
          sourceMicroserviceUuid: microserviceUuid,
        },
        {
          destMicroserviceUuid: microserviceUuid,
        },
      ],
  }
  const routes = await RoutingManager.findAll(query, transaction)
  for (const route of routes) {
    if (route.sourceIofogUuid && route.destIofogUuid && route.isNetworkConnection) {
      if (microserviceUuid == route.sourceMicroserviceUuid) {
        res.destRoutes.push(route)
      }
      if (microserviceUuid == route.destMicroserviceUuid) {
        res.sourceRoutes.push(route)
      }
    }
  }
  return res
}

async function _getPublicModesByMicroservice(microserviceUuid, transaction) {
  const res = []
  const query = {
    microserviceUuid: microserviceUuid,
  }
  const pubMods = await MicroservicePublicModeManager.findAll(query, transaction)
  for (const pub of pubMods) {
    res.push(pub)
  }
  return res
}

async function _getLogicalRoutesByMicroservice(microserviceUuid, transaction) {
  const res = []
  const query = {
    [Op.or]:
      [
        {
          sourceMicroserviceUuid: microserviceUuid,
        },
        {
          destMicroserviceUuid: microserviceUuid,
        },
      ],
  }
  const routes = await RoutingManager.findAll(query, transaction)
  for (const route of routes) {
    if (route.sourceMicroserviceUuid && route.destMicroserviceUuid) {
      res.push(route)
    }
  }
  return res
}

async function deleteMicroserviceWithRoutesAndPortMappings(microservice, transaction) {
  const routes = await _getLogicalRoutesByMicroservice(microservice.uuid, transaction)
  for (const route of routes) {
    await _deleteRoute(route, transaction)
  }

  const portMappings = await MicroservicePortManager.findAll({ microserviceUuid: microservice.uuid }, transaction)
  for (const ports of portMappings) {
    const user = {
      id: microservice.userId,
    }
    await _deletePortMapping(microservice, ports, user, transaction)
  }
  await MicroserviceManager.delete({
    uuid: microservice.uuid,
  }, transaction)
}

async function _buildLink(protocol, ip, port) {
  return `${protocol}://${ip}:${port}`
}

async function _buildGetMicroserviceResponse(microservice, transaction) {
  const microserviceUuid = microservice.uuid

  // get additional data
  const portMappings = await MicroservicePortManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
  const volumeMappings = await VolumeMappingManager.findAll({ microserviceUuid: microserviceUuid }, transaction)
  const routes = await RoutingManager.findAll({ sourceMicroserviceUuid: microserviceUuid }, transaction)
  const env = await MicroserviceEnvManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const cmd = await MicroserviceArgManager.findAllExcludeFields({ microserviceUuid: microserviceUuid }, transaction)
  const arg = cmd.map((it) => it.cmd)

  // build microservice response
  const res = Object.assign({}, microservice.dataValues)
  res.ports = portMappings.map((pm) => {
    return { internal: pm.portInternal, external: pm.portExternal, publicMode: pm.isPublic }
  })
  res.volumeMappings = volumeMappings.map((vm) => vm.dataValues)
  res.routes = routes.map((r) => r.destMicroserviceUuid)
  res.env = env
  res.cmd = arg

  return res
}

async function _recreateRoute(route, sourceMicroservice, destMicroservice, user, transaction) {
  await _deleteRoute(route, transaction)
  await _createRoute(sourceMicroservice, destMicroservice, user, transaction)
}

async function _recreatePublicMode(microservice, publicMode, user, transaction) {
  const portMapping = await MicroservicePortManager.findOne({ id: publicMode.microservicePortId }, transaction)
  const portMappingData = {
    internal: portMapping.portInternal,
    external: portMapping.portExternal,
    publicMode: portMapping.isPublic,
  }
  await _deletePortMappingOverConnector(microservice, portMapping, user, transaction)
  await _createPortMappingOverConnector(microservice, portMappingData, user, transaction)
}

// decorated functions
const createMicroserviceWithTracking = TrackingDecorator.trackEvent(createMicroserviceEndPoint,
    TrackingEventType.MICROSERVICE_CREATED)

module.exports = {
  createMicroserviceEndPoint: TransactionDecorator.generateTransaction(createMicroserviceWithTracking),
  listMicroservicesEndPoint: TransactionDecorator.generateTransaction(listMicroservicesEndPoint),
  getMicroserviceEndPoint: TransactionDecorator.generateTransaction(getMicroserviceEndPoint),
  updateMicroserviceEndPoint: TransactionDecorator.generateTransaction(updateMicroserviceEndPoint),
  deleteMicroserviceEndPoint: TransactionDecorator.generateTransaction(deleteMicroserviceEndPoint),
  createRouteEndPoint: TransactionDecorator.generateTransaction(createRouteEndPoint),
  deleteRouteEndPoint: TransactionDecorator.generateTransaction(deleteRouteEndPoint),
  createPortMappingEndPoint: TransactionDecorator.generateTransaction(createPortMappingEndPoint),
  listMicroservicePortMappingsEndPoint: TransactionDecorator.generateTransaction(listPortMappingsEndPoint),
  deletePortMappingEndPoint: TransactionDecorator.generateTransaction(deletePortMappingEndPoint),
  createVolumeMappingEndPoint: TransactionDecorator.generateTransaction(createVolumeMappingEndPoint),
  deleteVolumeMappingEndPoint: TransactionDecorator.generateTransaction(deleteVolumeMappingEndPoint),
  listVolumeMappingsEndPoint: TransactionDecorator.generateTransaction(listVolumeMappingsEndPoint),
  getPhysicalConnections: getPhysicalConnections,
  deleteNotRunningMicroservices: deleteNotRunningMicroservices,
  updateRouteOverConnector: updateRouteOverConnector,
  updatePortMappingOverConnector: updatePortMappingOverConnector,
  deleteMicroserviceWithRoutesAndPortMappings: deleteMicroserviceWithRoutesAndPortMappings,
}
