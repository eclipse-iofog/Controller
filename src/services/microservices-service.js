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

const TransactionDecorator = require('../decorators/transaction-decorator');
const MicroserviceManager = require('../sequelize/managers/microservice-manager');
const MicroservicePortManager = require('../sequelize/managers/microservice-port-manager');
const VolumeMappingManager = require('../sequelize/managers/volume-mapping-manager');
const RoutingManager = require('../sequelize/managers/routing-manager')
const ConnectorManager = require('../sequelize/managers/connector-manager')
const ConnectorPortManager = require('../sequelize/managers/connector-port-manager')
const ChangeTrackingManager = require('../sequelize/managers/change-tracking-manager');
const RoutingManager = require('../sequelize/managers/routing-manager');
const UserManager = require('../sequelize/managers/user-manager');
const FlowService = require('../services/flow-service');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const ErrorMessages = require('../helpers/error-messages');
const Validation = require('../schemas/index');
const ConnectorService = require('../services/connector-service')
const CatalogService = require('../services/catalog-service')

const _getMicroserviceByFlow = async function (flowId, user, isCLI, transaction) {
  await FlowService.getFlow(flowId, user, isCLI, transaction);

  const microservice = {
    flowId: flowId
  };

  return await MicroserviceManager.findAllWithDependencies(microservice,
  {
    exclude: [
      'configLastUpdated',
      'created_at',
      'updated_at',
      'catalogItemId',
      'updatedBy',
      'flowId'
    ]}, transaction);
};

const _getMicroservice = async function (microserviceUuid, user, isCLI, transaction) {
  await _checkIfMicroserviceIsValidOnGet(user.id, microserviceUuid, transaction);

  return await MicroserviceManager.findOneWithDependencies({
    uuid: microserviceUuid
  },
  {
     exclude: [
       'configLastUpdated',
       'created_at',
       'updated_at',
       'catalogItemId',
       'updatedBy',
       'flowId'
     ]}, transaction);
};

const _createMicroserviceOnFog = async function (microserviceData, user, isCLI, transaction) {
  await Validation.validate(microserviceData, Validation.schemas.microserviceCreate);

  const microservice = await _createMicroservice(microserviceData, user, isCLI, transaction);

  if (microserviceData.ports) {
    await _createMicroservicePorts(microserviceData.ports, microservice.uuid, transaction);
  }
  if (microserviceData.volumeMappings) {
    await _createVolumeMappings(microserviceData.volumeMappings, microservice.uuid, transaction);
  }

  if (microserviceData.routes){
    await _createRoutes(microserviceData.routes, microservice.uuid, user, transaction);
  }

  if(microserviceData.ioFogNodeId) {
    await _updateChangeTracking(false, microserviceData, user, isCLI, transaction);
  }

  return {
    uuid: microservice.uuid
  }
};

const _createMicroservice = async function (microserviceData, user, transaction) {

  if(microserviceData.isNetwork) {
    if (microserviceData.config !== undefined) {
      await Validation.validate(JSON.parse(microserviceData.config), Validation.schemas.networkConfig)
    } else {
      throw new Errors.ValidationError(ErrorMessages.INVALID_MICROSERVICE_CONFIG)
    }
  }

  const microserviceToCreate = {
    uuid: AppHelper.generateRandomString(32),
    name: microserviceData.name,
    config: microserviceData.config,
    isNetwork: microserviceData.isNetwork,
    catalogItemId: microserviceData.catalogItemId,
    flowId: microserviceData.flowId,
    iofogUuid: microserviceData.ioFogNodeId,
    rootHostAccess: microserviceData.rootHostAccess,
    logSize: microserviceData.logLimit,
  };

  const microserviceDataCreate = AppHelper.deleteUndefinedFields(microserviceToCreate);

  await _checkIfMicroserviceIsValidOnCreate(microserviceDataCreate, user.id, transaction);

  return await MicroserviceManager.create(microserviceDataCreate, transaction);
};

const _createMicroservicePorts = async function (ports, microserviceUuid, transaction) {
  const microservicePortToCreate = {
    portInternal: ports.internal,
    portExternal: ports.external,
    publicMode: ports.publicMode,
    microserviceUuid: microserviceUuid
  };

  const microservicePortDataCreate = AppHelper.deleteUndefinedFields(microservicePortToCreate);

  await MicroservicePortManager.create(microservicePortDataCreate, transaction);
};

const _createVolumeMappings = async function (volumeMappings, microserviceUuid, transaction) {

  for (let volumeMapping of volumeMappings) {
    volumeMapping.microserviceUuid = microserviceUuid
  }

  await VolumeMappingManager.bulkCreate(volumeMappings, transaction)
};

const _createRoutes = async function (routes, microserviceUuid, user, transaction) {
  for (let route of routes){
    await _createRoute(microserviceUuid, route, user, transaction)
  }
};

const _updateMicroservice = async function (microserviceUuid, microserviceData, user, isCLI, transaction) {
  await _getMicroservice(microserviceUuid, user, isCLI, transaction);

  await Validation.validate(microserviceData, Validation.schemas.microserviceUpdate);

  if(microserviceData.isNetwork) {
    if (microserviceData.config !== undefined) {
      await Validation.validate(JSON.parse(microserviceData.config), Validation.schemas.networkConfig)
    } else {
      throw new Errors.ValidationError(ErrorMessages.INVALID_MICROSERVICE_CONFIG)
    }
  }

  const microserviceToUpdate = {
    name: microserviceData.name,
    config: microserviceData.config,
    isNetwork: microserviceData.isNetwork,
    needUpdate: microserviceData.needUpdate,
    rebuild: microserviceData.rebuild,
    iofogUuid: microserviceData.ioFogNodeId,
    rootHostAccess: microserviceData.rootHostAccess,
    logSize: microserviceData.logLimit,
    updatedBy: user.id
  };

  const microserviceDataUpdate = AppHelper.deleteUndefinedFields(microserviceToUpdate);

  await _checkIfMicroserviceIsValidOnUpdate(user.id, microserviceUuid, microserviceDataUpdate, transaction);

  await MicroserviceManager.update({
    uuid: microserviceUuid
  }, microserviceDataUpdate, transaction);

  if (microserviceData.volumeMappings) {
    await _updateVolumeMappings(microserviceUuid.volumeMappings, microserviceData, transaction);
  }

  if (microserviceData.ioFogNodeId){
    await _deleteRoutes(microserviceData.routes, microserviceUuid, transaction);
    await _createRoutes(microserviceData.routes, microserviceUuid, user, transaction);
  }

  await _updateChangeTracking(microserviceData.config ? true : false, microserviceUuid, user, isCLI, transaction);
};

const _updateVolumeMappings = async function (volumeMappings, microserviceUuid, transaction) {
  for (let volumeMapping of volumeMappings) {
    await VolumeMappingManager.update({
      microserviceUuid: microserviceUuid
    }, volumeMapping, transaction);
  }
};

const _updateChangeTracking = async function (configUpdated, microserviceUuid, user, isCLI, transaction) {

  const microservice = await _getMicroservice(microserviceUuid, user, isCLI, transaction);

  const trackingData = {
    containerList: true,
    containerConfig: configUpdated,
    iofogUuid: microservice.fogNodeUuid
  };

  await ChangeTrackingManager.updateOrCreate({iofogUuid: fog.uuid}, trackingData, transaction);
};

const _deleteMicroservice = async function (microserviceUuid, deleteWithCleanUp, user, isCLI, transaction) {
  if (deleteWithCleanUp){
    return await _updateMicroservice(microserviceUuid, {deleteWithCleanUp: deleteWithCleanUp}, user, isCLI, transaction);
  }

  await _checkIfMicroserviceIsValidOnGet(user.id, microserviceUuid, transaction);

  const affectedRows = await MicroserviceManager.delete({
    uuid: microserviceUuid
  }, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid));
  }

  await _updateChangeTracking(false, microserviceUuid, user, isCLI, transaction)
};

const _deleteRoutes = async function(routes, microserviceUuid, user, transaction){
  for (let route of routes){
    await _deleteRoute(microserviceUuid, route, user, transaction)
  }
};

const _checkIfMicroserviceIsValidOnGet = async function (userId, microserviceUuid, transaction) {
  const where = {
    id: userId,
    '$flow->microservice.uuid$': microserviceUuid
  };
  const user = await UserManager.findUserOnMicroserviceGet(where, transaction)
  if (!user) {
    throw new Errors.ValidationError(ErrorMessages.INVALID_MICROSERVICE);
  }
};

const _checkIfMicroserviceIsValidOnUpdate = async function (userId, microserviceUuid, microserviceDataUpdate, transaction) {
  let where;
  if (microserviceDataUpdate.iofogUuid) {
    where = {
      id: userId,
      '$flow->microservice.uuid$': microserviceUuid,
      '$fog.uuid$': microserviceDataUpdate.iofogUuid
    }
  } else {
    where = {
      id: userId,
      '$flow->microservice.uuid$': microserviceUuid,
    }
  }
  const user = UserManager.findUserOnMicroserviceUpdate(where, transaction);
  if (!user) {
    throw new Errors.ValidationError(ErrorMessages.INVALID_MICROSERVICE);
  }
};

const _checkIfMicroserviceIsValidOnCreate = async function (microserviceDataCreate, userId, transaction) {
  let where;
  if (microserviceDataCreate.iofogUuid) {
    where = {
      id: userId,
      '$catalogItem.id$': microserviceDataCreate.catalogItemId,
      '$flow.id$': microserviceDataCreate.flowId,
      '$fog.uuid$': microserviceDataCreate.iofogUuid
    }
  } else {
    where = {
      id: userId,
      '$catalogItem.id$': microserviceDataCreate.catalogItemId,
      '$flow.id$': microserviceDataCreate.flowId
    }
  }

  const user = await UserManager.findUserOnMicroserviceCreate(where, transaction);
  if (!user) {
    throw new Errors.ValidationError(ErrorMessages.INVALID_MICROSERVICE);
  }
};

async function _createRoute(sourceMicroserviceUuid, destMicroserviceUuid, user, transaction) {
  const sourceMicroservice = await MicroserviceManager.findOne({uuid: sourceMicroserviceUuid}, transaction)
  if (!sourceMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, sourceMicroserviceUuid))
  }

  const destMicroservice = await MicroserviceManager.findOne({uuid: destMicroserviceUuid}, transaction)
  if (!destMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, destMicroserviceUuid))
  }

  if (!sourceMicroservice.iofogUuid || !destMicroservice.iofogUuid) {
    throw new Errors.ValidationError('fog not set')
  }
  if (!sourceMicroservice.flowId || !destMicroservice.flowId) {
    throw new Errors.ValidationError('microservices on different flows')
  }

  const route = await RoutingManager.findOne({
    sourceMicroserviceUuid: sourceMicroserviceUuid,
    destMicroserviceUuid: destMicroserviceUuid
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

/**
 * use to create route between microservices on same fog
 *
 * @param sourceMicroservice
 * @param destMicroservice
 * @param transaction
 * @returns {Promise<void>}
 * @private
 */
async function _createSimpleRoute(sourceMicroservice, destMicroservice, transaction) {
  //create new route
  const routeData = {
    isNetworkConnection: false,
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid,
    sourceIofogUuid: sourceMicroservice.iofogUuid,
    destIofogUuid: destMicroservice.iofogUuid //same as sourceIofogUuid
  }

  await RoutingManager.create(routeData, transaction)
  await _switchOnUpdateFlagsForMicroservices(sourceMicroservice, transaction, destMicroservice)
}

async function _createRouteOverConnector(sourceMicroservice, destMicroservice, user, transaction) {
  //open comsat
  const justOpenedConnectorsPorts = await ConnectorService.openPortOnRandomConnector(false, transaction)

  const ports = justOpenedConnectorsPorts.ports
  const connector = justOpenedConnectorsPorts.connector

  const createConnectorPortData = {
    port1: ports.port1,
    port2: ports.port2,
    maxConnectionsPort1: 60,
    maxConnectionsPort2: 0,
    passcodePort1: ports.passcode1,
    passcodePort2: ports.passcode2,
    heartBeatAbsenceThresholdPort1: 60000,
    heartBeatAbsenceThresholdPort2: 0,
    connectorId: ports.connectorId,
    mappingId: ports.id
  };
  const connectorPort = await ConnectorPortManager.create(createConnectorPortData, transaction)

  const networkCatalogItem = await CatalogService.getNetworkCatalogItem(transaction)

  //create netw ms1
  const sourceNetwMsConfig = {
    'mode': 'private', //TODO: for public 'public'
    'host': connector.domain,
    'cert': connector.cert,
    'port': ports.port1,
    'passcode': ports.passcode1,
    'connectioncount': 1, //TODO: for public 60
    'localhost': 'iofog',
    'localport': 0,
    'heartbeatfrequency': 20000,
    'heartbeatabsencethreshold': 60000,
    'devmode': connector.devMode
  }
  const sourceNetworkMicroservice = await _createNetworkMicroserviceForMaster(connector, ports, sourceMicroservice, sourceNetwMsConfig,networkCatalogItem, user, transaction);

  //create netw ms2
  const destNetwMsConfig = {
    'mode': 'private', //TODO: for public 'public'
    'host': connector.domain,
    'cert': connector.cert,
    'port': ports.port2,
    'passcode': ports.passcode2,
    'connectioncount': 1, //TODO: for public 60
    'localhost': 'iofog',
    'localport': 0,
    'heartbeatfrequency': 20000,
    'heartbeatabsencethreshold': 60000,
    'devmode': connector.devMode
  }
  const destNetworkMicroservice = await _createNetworkMicroserviceForMaster(connector, ports, destMicroservice, destNetwMsConfig,networkCatalogItem, user, transaction);

  //create new route
  const routeData = {
    isNetworkConnection: true,
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid,
    sourceIofogUuid: sourceMicroservice.iofogUuid,
    destIofogUuid: destMicroservice.iofogUuid,
    sourceNetworkMicroserviceUuid: sourceNetworkMicroservice.uuid,
    destNetworkMicroserviceUuid: destNetworkMicroservice.uuid,
    connectorPortId: connectorPort.id
  }
  await RoutingManager.create(routeData, transaction)

  await _switchOnUpdateFlagsForMicroservices(sourceMicroservice, transaction, destMicroservice)
}

async function _createNetworkMicroserviceForMaster(connector, ports, masterMicroservice, sourceNetwMsConfig, networkCatalogItem, user, transaction) {
  const sourceNetworkMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: `Network for Element ${masterMicroservice.uuid}`,
    config: JSON.stringify(sourceNetwMsConfig),
    isNetwork: true,
    catalogItemId: networkCatalogItem.id,
    flowId: masterMicroservice.flowId,
    iofogUuid: masterMicroservice.iofogUuid,
    rootHostAccess: false,
    logSize: 50,
    updatedBy: user.id,
    configLastUpdated: Date.now()
  }

  return await MicroserviceManager.create(sourceNetworkMicroserviceData, transaction);
}

async function _switchOnUpdateFlagsForMicroservices(sourceMicroservice, transaction, destMicroservice) {
  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({uuid: sourceMicroservice.uuid}, updateRebuildMs, transaction)
  await MicroserviceManager.update({uuid: destMicroservice.uuid}, updateRebuildMs, transaction)

  const updateChangeTrackingData = {
    containerConfig: true,
    containerList: true,
    routing: true
  }
  await ChangeTrackingManager.update({iofogUuid: sourceMicroservice.iofogUuid}, updateChangeTrackingData, transaction)
  await ChangeTrackingManager.update({iofogUuid: destMicroservice.iofogUuid}, updateChangeTrackingData, transaction)
}

async function _deleteRoute(sourceMicroserviceUuid, destMicroserviceUuid, user, transaction) {
  const sourceMicroservice = await MicroserviceManager.findOne({uuid: sourceMicroserviceUuid}, transaction)
  if (!sourceMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, sourceMicroserviceUuid))
  }

  const destMicroservice = await MicroserviceManager.findOne({uuid: destMicroserviceUuid}, transaction)
  if (!destMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, destMicroserviceUuid))
  }

  const route = await RoutingManager.findOne({
    sourceMicroserviceUuid: sourceMicroserviceUuid,
    destMicroserviceUuid: destMicroserviceUuid
  }, transaction)
  if (!route) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.ROUTE_NOT_FOUND))
  }

  if (route.isNetworkConnection) {
    await _deleteRouteOverConnector(route, transaction)
  } else {
    await _deleteSimpleRoute(route, transaction)
  }
}

async function _deleteSimpleRoute(route, transaction) {
  await RoutingManager.delete({id: route.id}, transaction)

  const updateChangeTrackingData = {
    routing: true
  }

  await ChangeTrackingManager.update({iofogUuid: route.sourceIofogUuid}, updateChangeTrackingData, transaction)
  await ChangeTrackingManager.update({iofogUuid: route.destIofogUuid}, updateChangeTrackingData, transaction)
}

async function _deleteRouteOverConnector(route, transaction) {
  const ports = await ConnectorPortManager.findOne({id: route.connectorPortId}, transaction)
  const connector = await ConnectorManager.findOne({id: ports.connectorId}, transaction)

  await ConnectorService.closePortOnConnector(connector, ports, transaction)

  await RoutingManager.delete({id: route.id}, transaction)
  await ConnectorPortManager.delete({id: ports.id}, transaction)
  await MicroserviceManager.delete({uuid: route.sourceNetworkMicroserviceUuid}, transaction)
  await MicroserviceManager.delete({uuid: route.destNetworkMicroserviceUuid}, transaction)

  const updateChangeTrackingData = {
    containerConfig: true,
    containerList: true,
    routing: true
  }

  await ChangeTrackingManager.update({iofogUuid: route.sourceIofogUuid}, updateChangeTrackingData, transaction)
  await ChangeTrackingManager.update({iofogUuid: route.destIofogUuid}, updateChangeTrackingData, transaction)
}

module.exports = {
  createMicroserviceOnFogWithTransaction: TransactionDecorator.generateTransaction(_createMicroserviceOnFog),
  getMicroserviceByFlowWithTransaction: TransactionDecorator.generateTransaction(_getMicroserviceByFlow),
  getMicroserviceWithTransaction: TransactionDecorator.generateTransaction(_getMicroservice),
  updateMicroserviceWithTransaction: TransactionDecorator.generateTransaction(_updateMicroservice),
  deleteMicroserviceWithTransaction: TransactionDecorator.generateTransaction(_deleteMicroservice),
  createRouteWithTransaction : TransactionDecorator.generateTransaction(_createRoute),
  deleteRouteWithTransaction: TransactionDecorator.generateTransaction(_deleteRoute)
};
