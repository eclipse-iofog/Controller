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
const ChangeTrackingManager = require('../sequelize/managers/change-tracking-manager');
const RoutingManager = require('../sequelize/managers/routing-manager');
const UserManager = require('../sequelize/managers/user-manager');
const FlowService = require('../services/flow-service');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const ErrorMessages = require('../helpers/error-messages');
const Validation = require('../schemas/index');

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

  const microservice = await _createMicroservice(microserviceData, user, transaction);

  if (microserviceData.ports) {
    await _createMicroservicePorts(microserviceData.ports, microservice.uuid, transaction);
  }
  if (microserviceData.volumeMappings) {
    await _createVolumeMappings(microserviceData.volumeMappings, microservice.uuid, transaction);
  }

  if (microserviceData.routes){
    await _createRoutes(microserviceData.routes, microservice.uuid, user, isCLI, transaction);
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

const _createRoutes = async function (routes, microserviceUuid, user, isCLI, transaction) {
  const routingObjArray = [];
  const sourceMicroservice = await _getMicroservice(microserviceUuid, user, isCLI, transaction);

  for (let route of routes){
    const destinationMicroservice = _getMicroservice(route, user, isCLI, transaction);

    const routeData = {
      publishingMicroserviceUuid: microserviceUuid,
      destinationMicroserviceUuid: route,
      isNetworkConnection: (sourceMicroservice.isNetwork && destinationMicroservice.isNetwork) ? true : false,
      publishingIofogUuid: sourceMicroservice.ioFogNodeId,
      destinationIofogUuid: destinationMicroservice.ioFogNodeId
    };

    const routeDataCreate = AppHelper.deleteUndefinedFields(routeData);
    routingObjArray.push(routeDataCreate);
  }

  await RoutingManager.bulkCreate(routingObjArray, transaction)
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
    await _createRoutes(microserviceData.routes, microserviceUuid, user, isCLI, transaction);
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

const _deleteRoutes = async function (routes, microserviceUuid, transaction){
  for (let route of routes){
    await RoutingManager.delete({
      publishingMicroserviceUuid: microserviceUuid,
      destinationMicroserviceUuid: route,
    }, transaction);
  }
};

const _deleteMicroservicePorts = async function (microserviceUuid, transaction){
  await MicroservicePortManager.delete({
    microserviceUuid: microserviceUuid
  }, transaction);
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

module.exports = {
  createMicroserviceOnFogWithTransaction: TransactionDecorator.generateTransaction(_createMicroserviceOnFog),
  getMicroserviceByFlowWithTransaction: TransactionDecorator.generateTransaction(_getMicroserviceByFlow),
  getMicroserviceWithTransaction: TransactionDecorator.generateTransaction(_getMicroservice),
  updateMicroserviceWithTransaction: TransactionDecorator.generateTransaction(_updateMicroservice),
  deleteMicroserviceWithTransaction: TransactionDecorator.generateTransaction(_deleteMicroservice)
};
