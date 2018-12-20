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
const TransactionDecorator = require('../decorators/transaction-decorator');
const MicroserviceManager = require('../sequelize/managers/microservice-manager');
const MicroserviceStatusManager = require('../sequelize/managers/microservice-status-manager');
const MicroservicePortManager = require('../sequelize/managers/microservice-port-manager');
const MicroserviceStates = require('../enums/microservice-state');
const VolumeMappingManager = require('../sequelize/managers/volume-mapping-manager');
const ConnectorManager = require('../sequelize/managers/connector-manager');
const ConnectorPortManager = require('../sequelize/managers/connector-port-manager');
const MicroservicePublicModeManager = require('../sequelize/managers/microservice-public-mode-manager');
const ChangeTrackingService = require('./change-tracking-service');
const IoFogService = require('../services/iofog-service');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const ErrorMessages = require('../helpers/error-messages');
const Validation = require('../schemas/index');
const ConnectorService = require('../services/connector-service');
const FlowService = require('../services/flow-service');
const CatalogService = require('../services/catalog-service');
const RoutingManager = require('../sequelize/managers/routing-manager');
const Op = require('sequelize').Op;
const fs = require('fs');

async function _listMicroservices(flowId, user, isCLI, transaction) {
  if (!isCLI) {
    await FlowService.getFlow(flowId, user, isCLI, transaction);
  }
  const where = isCLI ? {delete: false} : {flowId: flowId, delete: false};

  const microservices = await MicroserviceManager.findAllExcludeFields(where, transaction);
  return {
    microservices: microservices
  }
}

async function _getMicroservice(microserviceUuid, user, isCLI, transaction) {
  if (!isCLI) {
    await _validateMicroserviceOnGet(user.id, microserviceUuid, transaction);
  }

  const microservice = await MicroserviceManager.findOneExcludeFields({
    uuid: microserviceUuid, delete: false
  }, transaction);

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid));
  }
  return microservice;
}

async function _createMicroserviceOnFog(microserviceData, user, isCLI, transaction) {
  await Validation.validate(microserviceData, Validation.schemas.microserviceCreate);

  const microservice = await _createMicroservice(microserviceData, user, isCLI, transaction);

  if (microserviceData.ports) {
    for (const port of microserviceData.ports) {
      await _createPortMapping(microservice.uuid, port, user, isCLI, transaction);
    }
  }
  if (microserviceData.volumeMappings) {
    await _createVolumeMappings(microserviceData.volumeMappings, microservice.uuid, transaction);
  }

  if (microserviceData.routes) {
    await _createRoutes(microserviceData.routes, microservice.uuid, user, transaction);
  }

  if (microserviceData.iofogUuid) {
    await _updateChangeTracking(false, microserviceData.iofogUuid, transaction);
  }

  await _createMicroserviceStatus(microservice.uuid, transaction);

  return {
    uuid: microservice.uuid
  }
}

async function _createMicroservice(microserviceData, user, isCLI, transaction) {

  let newMicroservice = {
    uuid: AppHelper.generateRandomString(32),
    name: microserviceData.name,
    config: microserviceData.config,
    catalogItemId: microserviceData.catalogItemId,
    flowId: microserviceData.flowId,
    iofogUuid: microserviceData.iofogUuid,
    rootHostAccess: microserviceData.rootHostAccess,
    logSize: microserviceData.logLimit,
    userId: user.id
  };

  newMicroservice = AppHelper.deleteUndefinedFields(newMicroservice);

  await _checkForDuplicateName(newMicroservice.name, {}, user.id, transaction);

  //validate catalog item
  await CatalogService.getCatalogItem(newMicroservice.catalogItemId, user, isCLI, transaction);
  //validate flow
  await FlowService.getFlow(newMicroservice.flowId, user, isCLI, transaction);
  //validate fog node
  if (newMicroservice.iofogUuid) {
    await IoFogService.getFog({uuid: newMicroservice.iofogUuid}, user, isCLI, transaction);
  }

  return await MicroserviceManager.create(newMicroservice, transaction);
}

async function _createMicroserviceStatus(uuid, transaction) {
  return await MicroserviceStatusManager.create({
    microserviceUuid: uuid
  }, transaction);
}

async function _createVolumeMappings(volumeMappings, microserviceUuid, transaction) {

  for (let volumeMapping of volumeMappings) {
    volumeMapping.microserviceUuid = microserviceUuid
  }

  await VolumeMappingManager.bulkCreate(volumeMappings, transaction)
}

async function _createRoutes(routes, microserviceUuid, user, transaction) {
  for (let route of routes) {
    await _createRoute(microserviceUuid, route, user, false, transaction)
  }
}

async function _updateMicroservice(microserviceUuid, microserviceData, user, isCLI, transaction) {
  await Validation.validate(microserviceData, Validation.schemas.microserviceUpdate);

  const query = isCLI
    ?
    {
      uuid: microserviceUuid
    }
    :
    {
      uuid: microserviceUuid,
      userId: user.id
    };

  const microserviceToUpdate = {
    name: microserviceData.name,
    config: microserviceData.config,
    rebuild: microserviceData.rebuild,
    iofogUuid: microserviceData.iofogUuid,
    rootHostAccess: microserviceData.rootHostAccess,
    logSize: microserviceData.logLimit,
    volumeMappings: microserviceData.volumeMappings
  };

  const microserviceDataUpdate = AppHelper.deleteUndefinedFields(microserviceToUpdate);

  const microservice = await MicroserviceManager.findOne(query, transaction);
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  if (microserviceDataUpdate.name) {
    const userId = isCLI ? microservice.userId : user.id;
    await _checkForDuplicateName(microserviceDataUpdate.name, {id: microserviceUuid}, userId, transaction);
  }

  //validate fog node
  if (microserviceDataUpdate.iofogUuid) {
    await IoFogService.getFog({uuid: microserviceDataUpdate.iofogUuid}, user, isCLI, transaction);
  }

  await MicroserviceManager.update(query, microserviceDataUpdate, transaction);

  if (microserviceDataUpdate.volumeMappings) {
    await _updateVolumeMappings(microserviceDataUpdate.volumeMappings, microserviceUuid, transaction);
  }

  if (microserviceDataUpdate.iofogUuid && microserviceDataUpdate.iofogUuid !== microservice.iofogUuid) {
    const routes = await _getLogicalNetworkRoutesByFog(microservice.iofogUuid, transaction);
    for (let route of routes) {
      await _deleteRoute(route.sourceMicroserviceUuid, route.destMicroserviceUuid, user, isCLI, transaction);
      await _createRoute(route.sourceMicroserviceUuid, route.destMicroserviceUuid, user, isCLI, transaction);
      //update change tracking for another fog in route
      if (microservice.iofogUuid === route.sourceIofogUuid) {
        await _updateChangeTracking(false, route.destIofogUuid, transaction);
      } else if (microservice.iofogUuid === route.destIofogUuid) {
        await _updateChangeTracking(false, route.sourceIofogUuid, transaction);
      }
    }
    //update change tracking for old fog
    await _updateChangeTracking(false, microservice.iofogUuid, transaction);
  }

  //update change tracking for new fog
  await _updateChangeTracking(microserviceData.config ? true : false, microserviceDataUpdate.iofogUuid, transaction);
}

async function _updateVolumeMappings(volumeMappings, microserviceUuid, transaction) {
  for (let volumeMapping of volumeMappings) {
    await VolumeMappingManager.update({
      microserviceUuid: microserviceUuid
    }, volumeMapping, transaction);
  }
};

async function _updateChangeTracking(configUpdated, fogNodeUuid, transaction) {
  if (configUpdated) {
    await ChangeTrackingService.update(fogNodeUuid, ChangeTrackingService.events.microserviceCommon, transaction);
  } else {
    await ChangeTrackingService.update(fogNodeUuid, ChangeTrackingService.events.microserviceList, transaction);
  }
}

async function _deleteMicroservice(microserviceUuid, microserviceData, user, isCLI, transaction) {

  const where = isCLI
    ?
    {
      uuid: microserviceUuid,
    }
    :
    {
      uuid: microserviceUuid,
      userId: user.id
    };


  const microservice = await MicroserviceManager.findOneWithStatus(where, transaction);
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid));
  }

  await _deletePortMappings(microservice, user, transaction);

  if (microservice.microserviceStatus.status === MicroserviceStates.NOT_RUNNING) {
    await _deleteMicroserviceWithRoutes(microserviceUuid, transaction);
  } else {
    await MicroserviceManager.update({
        uuid: microserviceUuid
      },
      {
        delete: true,
        deleteWithCleanUp: !!microserviceData.withCleanup
      }, transaction);
  }

  await _updateChangeTracking(false, microservice.iofogUuid, transaction)
}

async function _deletePortMappings(microservice, user, transaction) {
  const msPortMappings = await MicroservicePortManager.findAll({
    microserviceUuid: microservice.uuid
  }, transaction);

  for (let msPorts of msPortMappings) {
    if (msPorts.isPublic) {
      await _deletePortMappingOverConnector(microservice, msPorts, user, transaction)
    } else {
      await _deleteSimplePortMapping(microservice, msPorts, user, transaction)
    }
  }
}

async function _deleteNotRunningMicroservices(transaction) {
  const microservices = await MicroserviceManager.findAllWithStatuses(transaction);
  microservices
    .filter(microservice => microservice.delete)
    .filter(microservice => microservice.microserviceStatus.status === MicroserviceStates.NOT_RUNNING)
    .forEach(microservice => _deleteMicroserviceWithRoutes(microservice.uuid, transaction));
}

async function _checkForDuplicateName(name, item, userId, transaction) {
  if (name) {
    const where = item.id
      ?
      {
        name: name,
        uuid: {[Op.ne]: item.id},
        userId: userId
      }
      :
      {
        name: name,
        userId: userId
      };

    const result = await MicroserviceManager.findOne(where, transaction);
    if (result) {
      throw new Errors.DuplicatePropertyError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, name));
    }
  }
}

async function _validateMicroserviceOnGet(userId, microserviceUuid, transaction) {
  const where = {
    '$flow.user.id$': userId,
    uuid: microserviceUuid
  };
  const microservice = await MicroserviceManager.findMicroserviceOnGet(where, transaction);
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_MICROSERVICE_USER);
  }
}

async function _createRoute(sourceMicroserviceUuid, destMicroserviceUuid, user, isCLI, transaction) {
  const sourceWhere = isCLI
    ? {uuid: sourceMicroserviceUuid}
    : {uuid: sourceMicroserviceUuid, userId: user.id};

  const sourceMicroservice = await MicroserviceManager.findOne(sourceWhere, transaction);
  if (!sourceMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, sourceMicroserviceUuid))
  }

  const destWhere = isCLI
    ? {uuid: destMicroserviceUuid}
    : {uuid: destMicroserviceUuid, userId: user.id};

  const destMicroservice = await MicroserviceManager.findOne(destWhere, transaction);
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

  let cert;
  if (!connector.devMode && connector.cert) {
    cert = AppHelper.trimCertificate(fs.readFileSync(connector.cert, "utf-8"))
  }

  //create netw ms1
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
    'devmode': connector.devMode
  }
  const sourceNetworkMicroservice = await _createNetworkMicroserviceForMaster(
    sourceMicroservice,
    sourceNetwMsConfig,
    networkCatalogItem,
    user,
    transaction
  );

  //create netw ms2
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
    'devmode': connector.devMode
  }
  const destNetworkMicroservice = await _createNetworkMicroserviceForMaster(
    destMicroservice,
    destNetwMsConfig,
    networkCatalogItem,
    user,
    transaction
  );

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
    configLastUpdated: Date.now()
  };

  return await MicroserviceManager.create(sourceNetworkMicroserviceData, transaction);
}

async function _switchOnUpdateFlagsForMicroservicesInRoute(sourceMicroservice, destMicroservice, transaction) {
  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({uuid: sourceMicroservice.uuid}, updateRebuildMs, transaction)
  await MicroserviceManager.update({uuid: destMicroservice.uuid}, updateRebuildMs, transaction)

  await ChangeTrackingService.update(sourceMicroservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  await ChangeTrackingService.update(destMicroservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
}

async function _deleteRoute(sourceMicroserviceUuid, destMicroserviceUuid, user, isCLI, transaction) {
  const sourceWhere = isCLI
    ? {uuid: sourceMicroserviceUuid}
    : {uuid: sourceMicroserviceUuid, userId: user.id};

  const sourceMicroservice = await MicroserviceManager.findOne(sourceWhere, transaction);
  if (!sourceMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, sourceMicroserviceUuid))
  }

  const destWhere = isCLI
    ? {uuid: destMicroserviceUuid}
    : {uuid: destMicroserviceUuid, userId: user.id};

  const destMicroservice = await MicroserviceManager.findOne(destWhere, transaction);
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

  await ChangeTrackingService.update(route.sourceIofogUuid, ChangeTrackingService.events.microserviceRouting, transaction)
  await ChangeTrackingService.update(route.destIofogUuid, ChangeTrackingService.events.microserviceRouting, transaction)
}

async function _deleteRouteOverConnector(route, transaction) {
  const ports = await ConnectorPortManager.findOne({id: route.connectorPortId}, transaction)
  const connector = await ConnectorManager.findOne({id: ports.connectorId}, transaction)

  try {
    await ConnectorService.closePortOnConnector(connector, ports, transaction);
  } catch (e) {
    logger.warn(`Can't close ports pair ${ports.mappingId} on connector ${connector.publicIp}. Delete manually if necessary`);
  }

  await RoutingManager.delete({id: route.id}, transaction)
  await ConnectorPortManager.delete({id: ports.id}, transaction)
  await MicroserviceManager.delete({uuid: route.sourceNetworkMicroserviceUuid}, transaction)
  await MicroserviceManager.delete({uuid: route.destNetworkMicroserviceUuid}, transaction)

  await ChangeTrackingService.update(route.sourceIofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  await ChangeTrackingService.update(route.destIofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
}

async function _createPortMapping(microserviceUuid, portMappingData, user, isCLI, transaction) {
  await Validation.validate(portMappingData, Validation.schemas.portsCreate);
  await _validatePorts(portMappingData.internal, portMappingData.external)

  const where = isCLI
    ? {uuid: microserviceUuid}
    : {uuid: microserviceUuid, userId: user.id};

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE));
  }

  const msPorts = await MicroservicePortManager.findOne({
    microserviceUuid: microserviceUuid,
    [Op.or]:
      [
        {
          portInternal: portMappingData.internal
        },
        {
          portExternal: portMappingData.external
        }
      ]
  }, transaction);
  if (msPorts) {
    throw new Errors.ValidationError(ErrorMessages.PORT_MAPPING_ALREADY_EXISTS);
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
    userId: microservice.userId,
    microserviceUuid: microservice.uuid
  }

  await MicroservicePortManager.create(mappingData, transaction)
  await _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, false, transaction)
}

async function _createPortMappingOverConnector(microservice, portMappingData, user, transaction) {
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

  let cert;
  if (!connector.devMode && connector.cert) {
    cert = AppHelper.trimCertificate(fs.readFileSync(connector.cert, "utf-8"));
  }
  //create netw ms1
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
    'devmode': connector.devMode
  }
  const networkMicroservice = await _createNetworkMicroserviceForMaster(
    microservice,
    netwMsConfig,
    networkCatalogItem,
    user,
    transaction
  );

  //create public port mapping
  const mappingData = {
    isPublic: true,
    portInternal: portMappingData.internal,
    portExternal: portMappingData.external,
    userId: microservice.userId,
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
  const publicLink = await _buildLink(connector.devMode ? 'http' : 'https', connector.publicIp, connectorPort.port2)
  return {publicLink: publicLink}
}

async function _switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, isPublic, transaction) {
  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({uuid: microservice.uuid}, updateRebuildMs, transaction)

  let updateChangeTrackingData = {}
  if (isPublic) {
    await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  } else {
    await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
  }
}

async function _deletePortMapping(microserviceUuid, internalPort, user, isCLI, transaction) {
  const where = isCLI
    ? {uuid: microserviceUuid}
    : {uuid: microserviceUuid, userId: user.id}

  const microservice = await MicroserviceManager.findOne(where, transaction);
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const msPorts = await MicroservicePortManager.findOne({
    microserviceUuid: microserviceUuid,
    portInternal: internalPort
  }, transaction)
  if (!msPorts) {
    throw new Errors.NotFoundError('port mapping not exists')
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
  const pubModeData = await MicroservicePublicModeManager.findOne({microservicePortId: msPorts.id}, transaction);

  const ports = await ConnectorPortManager.findOne({id: pubModeData.connectorPortId}, transaction);
  const connector = await ConnectorManager.findOne({id: ports.connectorId}, transaction);

  try {
    await ConnectorService.closePortOnConnector(connector, ports, transaction);
  } catch (e) {
    logger.warn(`Can't close ports pair ${ports.mappingId} on connector ${connector.publicIp}. Delete manually if necessary`);
  }
  await MicroservicePublicModeManager.delete({id: pubModeData.id}, transaction);
  await MicroservicePortManager.delete({id: msPorts.id}, transaction);
  await ConnectorPortManager.delete({id: ports.id}, transaction);
  await MicroserviceManager.delete({uuid: pubModeData.networkMicroserviceUuid}, transaction);

  const updateRebuildMs = {
    rebuild: true
  };
  await MicroserviceManager.update({uuid: microservice.uuid}, updateRebuildMs, transaction);

  await ChangeTrackingService.update(pubModeData.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction);
}

async function _validatePorts(internal, external) {
  if (internal <= 0 || internal > 65535
    || external <= 0 || external > 65535
    //TODO find this ports in project. check is possible to delete some of them
    || external === 60400 || external === 60401 || external === 10500 || external === 54321 || external === 55555) {

    throw new Errors.ValidationError('incorrect port')
  }
}

async function _buildPortsList(portsPairs, transaction) {
  const res = []
  for (const ports of portsPairs) {
    let portMappingResposeData = {
      internal: ports.portInternal,
      external: ports.portExternal,
      publicMode: ports.isPublic
    }
    if (ports.isPublic) {
      const pubMode = await MicroservicePublicModeManager.findOne({microservicePortId: ports.id}, transaction)
      const connectorPorts = await ConnectorPortManager.findOne({id: pubMode.connectorPortId}, transaction)
      const connector = await ConnectorManager.findOne({id: connectorPorts.connectorId}, transaction)

      portMappingResposeData.publicLink = await _buildLink(connector.devMode ? 'http' : 'https', connector.publicIp, connectorPorts.port2)
    }
    res.push(portMappingResposeData)
  }
  return res
}

async function _listPortMappings(microserviceUuid, user, isCLI, transaction) {
  const where = isCLI
    ? {uuid: microserviceUuid}
    : {uuid: microserviceUuid, userId: user.id};
  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const portsPairs = await MicroservicePortManager.findAll({microserviceUuid: microserviceUuid}, transaction)
  return await _buildPortsList(portsPairs, transaction)
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
      continue;
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

async function _getLogicalNetworkRoutesByFog(iofogUuid, transaction) {
  let res = [];
  const query = {
    [Op.or]:
      [
        {
          sourceIofogUuid: iofogUuid
        },
        {
          destIofogUuid: iofogUuid
        }
      ]
  };
  const routes = await RoutingManager.findAll(query, transaction)
  for (let route of routes) {
    if (route.sourceIofogUuid && route.destIofogUuid && route.isNetworkConnection) {
      res.push(route);
    }
  }
  return res;
}

async function _getLogicalRoutesByMicroservice(microserviceUuid, transaction) {
  let res = [];
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
  };
  const routes = await RoutingManager.findAll(query, transaction)
  for (let route of routes) {
    if (route.sourceMicroserviceUuid && route.destMicroserviceUuid) {
      res.push(route);
    }
  }
  return res;
}

async function _deleteMicroserviceWithRoutes(microserviceUuid, transaction) {
  const routes = await _getLogicalRoutesByMicroservice(microserviceUuid, transaction);
  for (let route of routes) {
    //TODO: simplify after splitting all endpoints service functions to validation and request processing part
    const userId = (await MicroserviceManager
      .findOne({uuid: route.sourceMicroserviceUuid}, transaction))
      .userId;
    const user = {
      id: userId
    };
    await _deleteRoute(route.sourceMicroserviceUuid, route.destMicroserviceUuid, user, false, transaction);
  }
  await MicroserviceManager.delete({
    uuid: microserviceUuid
  }, transaction);
}

async function _buildLink(protocol, ip, port) {
  return `${protocol}://${ip}:${port}`
}

async function _createVolumeMapping(microserviceUuid, volumeMappingData, user, isCLI, transaction) {
  await Validation.validate(volumeMappingData, Validation.schemas.volumeMappings);

  const where = isCLI
    ? {uuid: microserviceUuid}
    : {uuid: microserviceUuid, userId: user.id};

  const microservice = await MicroserviceManager.findOne(where, transaction);
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volueMapping = await VolumeMappingManager.findOne({
    microserviceUuid: microserviceUuid,
    hostDestination: volumeMappingData.hostDestination,
    containerDestination: volumeMappingData.containerDestination
  }, transaction);
  if (volueMapping) {
    throw new Errors.ValidationError(ErrorMessages.VOLUME_MAPPING_ALREADY_EXISTS);
  }

  const volumeMappingObj = {
    microserviceUuid: microserviceUuid,
    hostDestination: volumeMappingData.hostDestination,
    containerDestination: volumeMappingData.containerDestination,
    accessMode: volumeMappingData.accessMode
  };

  return await VolumeMappingManager.create(volumeMappingObj, transaction);
}

async function _deleteVolumeMapping(microserviceUuid, volumeMappingUuid, user, isCLI, transaction) {
  const where = isCLI
    ? {uuid: microserviceUuid}
    : {uuid: microserviceUuid, userId: user.id};

  const microservice = await MicroserviceManager.findOne(where, transaction);
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volumeMappingWhere = {
    uuid: volumeMappingUuid,
    microserviceUuid: microserviceUuid
  };

  const affectedRows = await VolumeMappingManager.delete(volumeMappingWhere, transaction);
  if (affectedRows === 0) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_VOLUME_MAPPING_UUID, volumeMappingUuid));
  }
}

async function _listVolumeMappings(microserviceUuid, user, isCLI, transaction) {
  const where = isCLI
    ? {uuid: microserviceUuid}
    : {uuid: microserviceUuid, userId: user.id};
  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const volumeMappingWhere = {
    microserviceUuid: microserviceUuid
  };
  return await VolumeMappingManager.findAll(volumeMappingWhere, transaction);
}

module.exports = {
  createMicroserviceOnFog: TransactionDecorator.generateTransaction(_createMicroserviceOnFog),
  listMicroservices: TransactionDecorator.generateTransaction(_listMicroservices),
  getMicroservice: TransactionDecorator.generateTransaction(_getMicroservice),
  updateMicroservice: TransactionDecorator.generateTransaction(_updateMicroservice),
  deleteMicroservice: TransactionDecorator.generateTransaction(_deleteMicroservice),
  createRoute: TransactionDecorator.generateTransaction(_createRoute),
  deleteRoute: TransactionDecorator.generateTransaction(_deleteRoute),
  createPortMapping: TransactionDecorator.generateTransaction(_createPortMapping),
  listMicroservicePortMappings: TransactionDecorator.generateTransaction(_listPortMappings),
  deletePortMapping: TransactionDecorator.generateTransaction(_deletePortMapping),
  createVolumeMapping: TransactionDecorator.generateTransaction(_createVolumeMapping),
  deleteVolumeMapping: TransactionDecorator.generateTransaction(_deleteVolumeMapping),
  listVolumeMappings: TransactionDecorator.generateTransaction(_listVolumeMappings),
  getPhysicalConections: getPhysicalConections,
  deleteNotRunningMicroservices: _deleteNotRunningMicroservices
};
