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
const ConnectorManager = require('../sequelize/managers/connector-manager');
const ConnectorPortManager = require('../sequelize/managers/connector-port-manager');
const MicroservicePublicModeManager = require('../sequelize/managers/microservice-public-mode-manager');
const ChangeTrackingManager = require('../sequelize/managers/change-tracking-manager');
const FlowService = require('../services/flow-service');
const IoFogService = require('../services/iofog-service');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const ErrorMessages = require('../helpers/error-messages');
const Validation = require('../schemas/index');
const ConnectorService = require('../services/connector-service')
const CatalogService = require('../services/catalog-service')
const RoutingManager = require('../sequelize/managers/routing-manager')

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
      'flowId',
      'registryId'
    ]}, transaction);
};

const _getMicroservice = async function (microserviceUuid, user, isCLI, transaction) {
  await _validateMicroserviceOnGet(user.id, microserviceUuid, transaction);

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
       'flowId',
       'registryId'
     ]}, transaction);
};

const _createMicroserviceOnFog = async function (microserviceData, user, isCLI, transaction) {
  await Validation.validate(microserviceData, Validation.schemas.microserviceCreate);

  const microservice = await _createMicroservice(microserviceData, user, isCLI, transaction);

  if (microserviceData.ports) {
    //TODO _createPortMapping for each port pair
    await _createMicroservicePorts(microserviceData.ports, microservice.uuid, transaction);
  }
  if (microserviceData.volumeMappings) {
    await _createVolumeMappings(microserviceData.volumeMappings, microservice.uuid, transaction);
  }

  if (microserviceData.routes){
    await _createRoutes(microserviceData.routes, microservice.uuid, user, transaction);
  }

  if(microserviceData.ioFogNodeId) {
    await _updateChangeTracking(false, microservice.uuid, microserviceData.ioFogNodeId, user, isCLI, transaction);
  }

  return {
    uuid: microservice.uuid
  }
};

const _createMicroservice = async function (microserviceData, user, isCLI, transaction) {

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

  //validate catalog item
  await CatalogService.getCatalogItem(microserviceDataCreate.catalogItemId, user, isCLI, transaction);
  //validate flow
  await FlowService.getFlow(microserviceDataCreate.flowId, user, isCLI, transaction);
  //validate fog node
  if (microserviceDataCreate.iofogUuid) {
    await IoFogService.getFog({uuid: microserviceDataCreate.iofogUuid}, user, isCLI, transaction);
  }

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

  const microservice = await _getMicroservice(microserviceUuid, user, isCLI, transaction);

  // if(microserviceDataUpdate.name){
  //   await isMicroserviceExist(microserviceDataUpdate.name, transaction);
  // }

  //validate fog node
  if (microserviceDataUpdate.iofogUuid) {
    await IoFogService.getFog({uuid: microserviceDataUpdate.iofogUuid}, user, isCLI, transaction);
  }

  await MicroserviceManager.update({
    uuid: microserviceUuid
  }, microserviceDataUpdate, transaction);

  if (microserviceDataUpdate.volumeMappings) {
    await _updateVolumeMappings(microserviceUuid.volumeMappings, microserviceData, transaction);
  }

  if (microserviceDataUpdate.ioFogNodeId){
    await _deleteRoutes(microserviceData.routes, microserviceUuid, transaction);
    await _createRoutes(microserviceData.routes, microserviceUuid, user, transaction);
    await _updateChangeTracking(false, microserviceUuid, microserviceDataUpdate.ioFogNodeId, user, isCLI, transaction)
  }

  await _updateChangeTracking(microserviceData.config ? true : false, microserviceUuid, microservice.ioFogNodeId, user, isCLI, transaction);
};

const _updateVolumeMappings = async function (volumeMappings, microserviceUuid, transaction) {
  for (let volumeMapping of volumeMappings) {
    await VolumeMappingManager.update({
      microserviceUuid: microserviceUuid
    }, volumeMapping, transaction);
  }
};

const _updateChangeTracking = async function (configUpdated, microserviceUuid, fogNodeUuid, user, isCLI, transaction) {

  const trackingData = {
    containerList: true,
    containerConfig: configUpdated,
    iofogUuid: fogNodeUuid
  };

  await ChangeTrackingManager.update({iofogUuid: fogNodeUuid}, trackingData, transaction);
};

const _deleteMicroservice = async function (microserviceUuid, deleteWithCleanUp, user, isCLI, transaction) {
  if (deleteWithCleanUp){
    return await MicroserviceManager.update({
      uuid: microserviceUuid
    },
    {
      deleteWithCleanUp: deleteWithCleanUp
    }, transaction);
  }

  const microservice = await _getMicroservice(microserviceUuid, user, isCLI, transaction);

  const affectedRows = await MicroserviceManager.delete({
    uuid: microserviceUuid
  }, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid));
  }

  await _updateChangeTracking(false, microserviceUuid, microservice.ioFogNodeId, user, isCLI, transaction)
};

const _deleteRoutes = async function(routes, microserviceUuid, user, transaction){
  for (let route of routes){
    await _deleteRoute(microserviceUuid, route, user, transaction)
  }
};

const _validateMicroserviceOnGet = async function (userId, microserviceUuid, transaction) {
  const where = {
    '$flow.user.id$': userId,
    uuid: microserviceUuid
  };
  const microservice = await MicroserviceManager.findMicroserviceOnGet(where, transaction);
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_MICROSERVICE_USER);
  }
};

async function _createRoute(sourceMicroserviceUuid, destMicroserviceUuid, user, transaction) {
  const sourceMicroservice = await MicroserviceManager.findOne({uuid: sourceMicroserviceUuid, updatedBy: user.id}, transaction)
  if (!sourceMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, sourceMicroserviceUuid))
  }

  const destMicroservice = await MicroserviceManager.findOne({uuid: destMicroserviceUuid, updatedBy: user.id}, transaction)
  if (!destMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, destMicroserviceUuid))
  }

  if (!sourceMicroservice.iofogUuid || !destMicroservice.iofogUuid) {
    throw new Errors.ValidationError('fog not set')
  }
  if (sourceMicroservice.flowId !== destMicroservice.flowId) {
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
  await _switchOnUpdateFlagsForMicroservicesInRoute(sourceMicroservice, destMicroservice, transaction)
}

async function _createRouteOverConnector(sourceMicroservice, destMicroservice, user, transaction) {
  //open comsat
  const justOpenedConnectorsPorts = await ConnectorService.openPortOnRandomConnector(false, transaction)

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
    mappingId: ports.id
  };
  const connectorPort = await ConnectorPortManager.create(createConnectorPortData, transaction)

  const networkCatalogItem = await CatalogService.getNetworkCatalogItem(transaction)

  //create netw ms1
  const sourceNetwMsConfig = {
    'mode': 'private',
    'host': connector.domain,
    'cert': connector.cert,
    'port': ports.port1,
    'passcode': ports.passcode1,
    'connectioncount': 1,
    'localhost': 'iofog',
    'localport': 0,
    'heartbeatfrequency': 20000,
    'heartbeatabsencethreshold': 60000,
    'devmode': connector.devMode
  }
  const sourceNetworkMicroservice = await _createNetworkMicroserviceForMaster(connector, ports, sourceMicroservice, sourceNetwMsConfig,networkCatalogItem, user, transaction);

  //create netw ms2
  const destNetwMsConfig = {
    'mode': 'private',
    'host': connector.domain,
    'cert': connector.cert,
    'port': ports.port2,
    'passcode': ports.passcode2,
    'connectioncount': 1,
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

  await _switchOnUpdateFlagsForMicroservicesInRoute(sourceMicroservice, destMicroservice, transaction)
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

async function _switchOnUpdateFlagsForMicroservicesInRoute(sourceMicroservice, destMicroservice, transaction) {
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
  const sourceMicroservice = await MicroserviceManager.findOne({uuid: sourceMicroserviceUuid, updatedBy: user.id}, transaction)
  if (!sourceMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, sourceMicroserviceUuid))
  }

  const destMicroservice = await MicroserviceManager.findOne({uuid: destMicroserviceUuid, updatedBy: user.id}, transaction)
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

async function _createPortMapping(microserviceUuid, portMappingData, user, transaction) {
  await Validation.validate(portMappingData, Validation.schemas.ports);
  const microservice = await MicroserviceManager.findOne({uuid: microserviceUuid, updatedBy: user.id}, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError('fog not set')
  }

  const msPorts = await MicroservicePortManager.findOne({
    microserviceUuid: microserviceUuid,
    $or:
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
    throw new Errors.ValidationError('port mapping already exists')
  }

  if (portMappingData.publicMode) {
    return await _createPortMappingOverConnector(microservice, portMappingData, user, transaction)
  } else {
    return await _createSimplePortMapping(microservice, portMappingData, user, transaction)
  }
}

async function _createSimplePortMapping(microservice, portMappingData, user, transaction) {
  //create port mapping
  const mappingData = {
    isPublic: false,
    portInternal: portMappingData.internal,
    portExternal: portMappingData.external,
    updatedBy: user.id,
    microserviceUuid: microservice.uuid
  }

  await MicroservicePortManager.create(mappingData, transaction)
  await _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, false, transaction)
}

async function _createPortMappingOverConnector(microservice, portMappingData, user, transaction) {
  await _validatePorts(portMappingData.internal, portMappingData.external)

  //open comsat
  const justOpenedConnectorsPorts = await ConnectorService.openPortOnRandomConnector(true, transaction)

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
    mappingId: ports.id
  };
  const connectorPort = await ConnectorPortManager.create(createConnectorPortData, transaction)

  const networkCatalogItem = await CatalogService.getNetworkCatalogItem(transaction)

  //create netw ms1
  const netwMsConfig = {
    'mode': 'public',
    'host': connector.domain,
    'cert': connector.cert,
    'port': ports.port1,
    'passcode': ports.passcode1,
    'connectioncount': 60,
    'localhost': 'iofog',
    'localport': 0,
    'heartbeatfrequency': 20000,
    'heartbeatabsencethreshold': 60000,
    'devmode': connector.devMode
  }
  const networkMicroservice = await _createNetworkMicroserviceForMaster(connector, ports, microservice, netwMsConfig,networkCatalogItem, user, transaction);

  //create public port mapping
  const mappingData = {
    isPublic: true,
    portInternal: portMappingData.internal,
    portExternal: portMappingData.external,
    updatedBy: user.id,
    microserviceUuid: microservice.uuid
  }

  const msPortMapping = await MicroservicePortManager.create(mappingData, transaction)

  const msPubModeData = {
    microserviceUuid: microservice.uuid,
    networkMicroserviceUuid: networkMicroservice.uuid,
    iofogUuid: microservice.iofogUuid,
    microservicePortId: msPortMapping.id,
    connectorPortId: connectorPort.id
  }
  await MicroservicePublicModeManager.create(msPubModeData, transaction)


  await _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, true, transaction)
  return {publicIp: connector.publicIp, publicPort: connectorPort.port2}
}

async function _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, isPublic, transaction) {
  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({uuid: microservice.uuid}, updateRebuildMs, transaction)

  let updateChangeTrackingData = {}
  if (isPublic) {
    updateChangeTrackingData = {
      containerConfig: true,
      containerList: true,
      routing: true
    }
  } else {
    updateChangeTrackingData = {
      containerConfig: true,
    }
  }
  await ChangeTrackingManager.update({iofogUuid: microservice.iofogUuid}, updateChangeTrackingData, transaction)
}

async function _deletePortMapping(microserviceUuid, internalPort, user, transaction) {
  const microservice = await MicroserviceManager.findOne({uuid: microserviceUuid, updatedBy: user.id}, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const msPorts = await MicroservicePortManager.findOne({
    microserviceUuid: microserviceUuid,
    portInternal: internalPort
  }, transaction)
  if (!msPorts) {
    throw new Errors.ValidationError('port mapping not exists')
  }

  if (msPorts.isPublic) {
    await _deletePortMappingOverConnector(microservice, msPorts, user, transaction)
  } else {
    await _deleteSimplePortMapping(microservice, msPorts, user, transaction)
  }
}

async function _deleteSimplePortMapping(microservice, msPorts, user, transaction) {
  await MicroservicePortManager.delete({id: msPorts.id}, transaction)

  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({uuid: microservice.uuid}, updateRebuildMs, transaction)
}

async function _deletePortMappingOverConnector(microservice, msPorts, user, transaction) {
  const pubModeData = await MicroservicePublicModeManager.findOne({microservicePortId: msPorts.id}, transaction)

  const ports = await ConnectorPortManager.findOne({id: pubModeData.connectorPortId}, transaction)
  const connector = await ConnectorManager.findOne({id: ports.connectorId}, transaction)

  await ConnectorService.closePortOnConnector(connector, ports, transaction)

  await MicroservicePublicModeManager.delete({id: pubModeData.id}, transaction)
  await MicroservicePortManager.delete({id: msPorts.id}, transaction)
  await ConnectorPortManager.delete({id: ports.id}, transaction)
  await MicroserviceManager.delete({uuid: pubModeData.networkMicroserviceUuid}, transaction)

  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({uuid: microservice.uuid}, updateRebuildMs, transaction)

  const updateChangeTrackingData = {
    containerConfig: true,
    containerList: true,
    routing: true
  }
  await ChangeTrackingManager.update({iofogUuid: pubModeData.iofogUuid}, updateChangeTrackingData, transaction)
}

async function _validatePorts(internal, external) {
  if (internal < 0 || internal > 65535
    || external < 0 || external > 65535
    //TODO find this ports in project. check is possible to delete some of them
    || external === 60400 || external === 60401 || external === 10500 || external === 54321 || external === 55555) {

    throw new Errors.ValidationError('incorrect port')
  }
}

async function getPhysicalConections(microservice, transaction) {
  let res = []
  const pubModes = await MicroservicePublicModeManager.findAll({microserviceUuid: microservice.uuid}, transaction)
  for (const pm of pubModes) {
    res.push(pm.networkMicroserviceUuid)
  }

  const sourceRoutes = await RoutingManager.findAll({sourceMicroserviceUuid: microservice.uuid}, transaction)
  for (const sr of sourceRoutes) {
    if (!sr.sourceIofogUuid || !sr.destIofogUuid) {
      break;
    } else if (sr.sourceIofogUuid === sr.destIofogUuid) {
      res.push(sr.destMicroserviceUuid)
    } else if (sr.sourceIofogUuid !== sr.destIofogUuid) {
      res.push(sr.sourceNetworkMicroserviceUuid)
    }
  }

  const netwRoutes = await RoutingManager.findAll({destNetworkMicroserviceUuid: microservice.uuid}, transaction)
  for (const nr of netwRoutes) {
    res.push(nr.destMicroserviceUuid)
  }

  return res
}

module.exports = {
  createMicroserviceOnFogWithTransaction: TransactionDecorator.generateTransaction(_createMicroserviceOnFog),
  getMicroserviceByFlowWithTransaction: TransactionDecorator.generateTransaction(_getMicroserviceByFlow),
  getMicroserviceWithTransaction: TransactionDecorator.generateTransaction(_getMicroservice),
  updateMicroserviceWithTransaction: TransactionDecorator.generateTransaction(_updateMicroservice),
  deleteMicroserviceWithTransaction: TransactionDecorator.generateTransaction(_deleteMicroservice),
  createRouteWithTransaction : TransactionDecorator.generateTransaction(_createRoute),
  deleteRouteWithTransaction: TransactionDecorator.generateTransaction(_deleteRoute),
  createPortMappingWithTransaction: TransactionDecorator.generateTransaction(_createPortMapping),
  deletePortMappingWithTransaction: TransactionDecorator.generateTransaction(_deletePortMapping),
  getPhysicalConections: getPhysicalConections
};
