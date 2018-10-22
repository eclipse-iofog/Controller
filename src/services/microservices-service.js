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
const ConnectorPortManager = require('../sequelize/managers/connector-port-manager')
const ChangeTrackingManager = require('../sequelize/managers/change-tracking-manager')
const IOFogService = require('../services/iofog-service');
const FlowService = require('../services/flow-service');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const ErrorMessages = require('../helpers/error-messages');
const Validation = require('../schemas/index');
const ConnectorService = require('../services/connector-service')
const CatalogService = require('../services/catalog-service')

const _getMicroserviceByFlow = async function (flowId, user, transaction) {
  await FlowService.getFlow(flowId, user, false, transaction);

  const microservice = {
    flowId: flowId
  };

  return await MicroserviceManager.findAllWithDependencies(microservice, {}, transaction)
};

const _getMicroservice = async function (microserviceUuid, user, transaction) {
  const microservice = await MicroserviceManager.findOneWithDependencies({
    uuid: microserviceUuid
  },
  {}, transaction);

  await FlowService.getFlow(microservice.flowId, user, transaction);

  await IOFogService.getFogWithTransaction({
    uuid: microservice.iofogUuid
  }, user, transaction);

  return microservice;
};

const _createMicroserviceOnFog = async function (microserviceData, user, transaction) {
  await Validation.validate(microserviceData, Validation.schemas.microserviceCreate);

  const microservice = await _createMicroservice(microserviceData, user, transaction);

  if (microserviceData.port) {
    await _createMicroservicePort(microserviceData, microservice.uuid, transaction);
  }
  if (microserviceData.volumeMappings) {
    await _createVolumeMappings(microserviceData, microservice.uuid, transaction);
  }
  // TODO: create routes

  return {
    uuid: microservice.uuid
  }
};

const _createMicroservice = async function (microserviceData, user, transaction) {
  const microserviceToCreate = {
    uuid: AppHelper.generateRandomString(32),
    name: microserviceData.name,
    config: microserviceData.config,
    isNetwork: microserviceData.isNetwork,
    needUpdate: microserviceData.needUpdate,
    rebuild: microserviceData.rebuild,
    catalogItemId: microserviceData.catalogItemId,
    flowId: microserviceData.flowId,
    iofogUuid: microserviceData.ioFogNodeId,
    rootHostAccess: microserviceData.rootHostAccess,
    logSize: microserviceData.logLimit,
  };

  const microserviceDataCreate = AppHelper.deleteUndefinedFields(microserviceToCreate);

  if (microserviceDataCreate.flowId) {
    await FlowService.getFlow(microserviceDataCreate.flowId, user, transaction);
  }

  if (microserviceDataCreate.iofogUuid) {
    await IOFogService.getFogWithTransaction({ //TODO do not use this method here it's only for endpoints
      uuid: microserviceDataCreate.iofogUuid
    }, user, transaction);
  }

  return await MicroserviceManager.create(microserviceDataCreate, transaction);
};

const _createMicroservicePort = async function (microserviceData, microserviceUuid, transaction) {
  const microservicePortToCreate = {
    portInternal: microserviceData.ports.internal,
    portExternal: microserviceData.ports.external,
    microserviceUuid: microserviceUuid
  };

  const microservicePortDataCreate = AppHelper.deleteUndefinedFields(microservicePortToCreate);

  await MicroservicePortManager.create(microservicePortDataCreate, transaction);
};

const _createVolumeMappings = async function (microserviceData, microserviceUuid, transaction) {
  const volumeMappings = microserviceData.volumeMappings;

  for (let volumeMapping of volumeMappings) {
    volumeMapping.microserviceUuid = microserviceUuid
  }

  await VolumeMappingManager.bulkCreate(volumeMappings, transaction)
};

const _updateMicroservice = async function (microserviceUuid, microserviceData, user, transaction) {
  await _getMicroservice(microserviceUuid, user, transaction);

  await Validation.validate(microserviceData, Validation.schemas.microserviceUpdate);

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

  if (microserviceDataUpdate.iofogUuid) {
    await IOFogService.getFogWithTransaction({
      uuid: microserviceDataUpdate.iofogUuid
    }, user);
  }

  await MicroserviceManager.update({
    uuid: microserviceUuid
  }, microserviceDataUpdate, transaction);

  if (microserviceData.ports) {
    await _updateMicroservicePort(microserviceUuid, microserviceData, user, transaction);
  }
  if (microserviceData.volumeMappings) {
    await _updateVolumeMappings(microserviceUuid, microserviceData, transaction);
  }
  // TODO: update routes
};

const _updateMicroservicePort = async function (microserviceUuid, microserviceData, user, transaction) {
  const microservicePortToUpdate = {
    portInternal: microserviceData.ports.internal,
    portExternal: microserviceData.ports.external,
    updatedBy: user.id
  };

  const microservicePortDataUpdate = AppHelper.deleteUndefinedFields(microservicePortToUpdate);

  await MicroservicePortManager.update({
    microserviceUuid: microserviceUuid
  }, microservicePortDataUpdate, transaction);
};

const _updateVolumeMappings = async function (microserviceData, microserviceUuid, transaction) {
  const volumeMappings = microserviceData.volumeMappings;

  for (let volumeMapping of volumeMappings) {
    await VolumeMappingManager.update({
      microserviceUuid: microserviceUuid
    }, volumeMapping, transaction);
  }
};

const _deleteMicroservice = async function (microserviceUuid, user, transaction) {
  const affectedRows = await MicroserviceManager.delete({
    uuid: microserviceUuid
  }, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid));
  }
};

async function _createRoute(sourceMicroserviceUuid, destMicroserviceUuid, user, transaction) {
  const sourceMicroservice = await MicroserviceManager.findOne({uuid: sourceMicroserviceUuid}, transaction)
  if (!sourceMicroservice) {
    throw new Errors.ModelNotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, sourceMicroserviceUuid))
  }

  const destMicroservice = await MicroserviceManager.findOne({uuid: destMicroserviceUuid}, transaction)
  if (!destMicroservice) {
    throw new Errors.ModelNotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, destMicroserviceUuid))
  }

  if (!sourceMicroservice.iofogUuid || !destMicroservice.iofogUuid) {
    throw new Errors.ValidationError('fog not set')
  }
  if (!sourceMicroservice.flowId || !destMicroservice.flowId) {
    throw new Errors.ValidationError('microservices on different flows')
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
  const connectorPorts = await ConnectorService.openPortOnRandomConnector(false, transaction)

  const ports = connectorPorts.ports
  const connector = connectorPorts.connector

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
  await ConnectorPortManager.create(createConnectorPortData, transaction)

  const networkCatalogItem = CatalogService.getNetworkCatalogItem(transaction)

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
  const sourceNetworkMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: `Network for Element ${sourceMicroservice.uuid}`,
    config: JSON.stringify(sourceNetwMsConfig),
    isNetwork: true,
    catalogItemId: networkCatalogItem.id,
    flowId: sourceMicroservice.flowId,
    iofogUuid: sourceMicroservice.iofogUuid,
    rootHostAccess: false,
    logSize: 50,
    updatedBy: user.id,

    //TODO strange parameters
    configLastUpdated: Date.now(), //TODO can be not setted, because it's creation
    registryId: networkCatalogItem.registryId, //TODO redundant field in db. discuss with dbusel
  }

  const sourceNetworkMicroservice = await MicroserviceManager.create(sourceNetworkMicroserviceData, transaction);

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
  const destNetworkMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: `Network for Element ${destMicroservice.uuid}`,
    config: JSON.stringify(destNetwMsConfig),
    isNetwork: true,
    catalogItemId: networkCatalogItem.id,
    flowId: destMicroservice.flowId,
    iofogUuid: destMicroservice.iofogUuid,
    rootHostAccess: false,
    logSize: 50,
    updatedBy: user.id,

    //TODO strange parameters
    configLastUpdated: Date.now(), //TODO can be not setted, because it's creation
    registryId: networkCatalogItem.registryId, //TODO redundant field in db. discuss with dbusel
  }

  const destNetworkMicroservice = await MicroserviceManager.create(destNetworkMicroserviceData, transaction);

  //create new route
  const routeData = {
    isNetworkConnection: true,
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid,
    sourceIofogUuid: sourceMicroservice.iofogUuid,
    destIofogUuid: destMicroservice.iofogUuid,
    sourceNetworkMicroserviceUuid: sourceNetworkMicroservice.uuid,
    destNetworkMicroserviceUuid: destNetworkMicroservice.uuid,
  }
  await RoutingManager.create(routeData, transaction)

  await _switchOnUpdateFlagsForMicroservices(sourceMicroservice, transaction, destMicroservice)
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

module.exports = {
  createMicroserviceOnFog: TransactionDecorator.generateTransaction(_createMicroserviceOnFog),
  getMicroserviceByFlow: TransactionDecorator.generateTransaction(_getMicroserviceByFlow),
  getMicroservice: TransactionDecorator.generateTransaction(_getMicroservice),
  updateMicroservice: TransactionDecorator.generateTransaction(_updateMicroservice),
  deleteMicroservice: TransactionDecorator.generateTransaction(_deleteMicroservice),
  createRouteWithTransaction : TransactionDecorator.generateTransaction(_createRoute)
};
