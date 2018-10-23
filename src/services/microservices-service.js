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
const UserManager = require('../sequelize/managers/user-manager');
const IOFogService = require('../services/iofog-service');
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
  const microservice = await MicroserviceManager.findOneWithDependencies({
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

  await FlowService.getFlow(microservice.flowId, user, isCLI, transaction);

  await IOFogService.getFog({
    uuid: microservice.iofogUuid
  }, user, isCLI, transaction);

  return microservice;
};

const _createMicroserviceOnFog = async function (microserviceData, user, isCLI, transaction) {
  await Validation.validate(microserviceData, Validation.schemas.microserviceCreate);

  const microservice = await _createMicroservice(microserviceData, user, isCLI, transaction);

  if (microserviceData.port) {
    await _createMicroservicePort(microserviceData, microservice.uuid, transaction);
  }
  if (microserviceData.volumeMappings) {
    await _createVolumeMappings(microserviceData, microservice.uuid, transaction);
  }
  // TODO: create routes

  if(microserviceData.ioFogNodeId) {
    await _updateChangeTracking(false, microserviceData.ioFogNodeId, transaction);
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

  await _checkIfMicroserviceIsValid(microserviceDataCreate, user.id, transaction);

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

  if(microserviceData.ioFogNodeId) {
    await _updateChangeTracking(microserviceData.config ? true : false, microserviceData.ioFogNodeId, transaction);
  }
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

const _updateChangeTracking = async function (configUpdated, fogNodeUuid, transaction) {
  const trackingData = {
    containerList: true,
    containerConfig: configUpdated,
    iofogUuid: fogNodeUuid
  };

  await ChangeTrackingManager.update({iofogUuid: fog.uuid}, trackingData, transaction);
};

const _deleteMicroservice = async function (microserviceUuid, user, isCLI, transaction) {
  // TODO: update changeTracking

  const affectedRows = await MicroserviceManager.delete({
    uuid: microserviceUuid
  }, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid));
  }
};

const _checkIfMicroserviceIsValid = async function (microserviceDataCreate, userId, transaction) {
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

  const user = await UserManager.findUserForMicroservice(where, transaction);
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
