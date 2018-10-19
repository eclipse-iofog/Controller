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
const IOFogService = require('../services/iofog-service');
const FlowService = require('../services/flow-service');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const ErrorMessages = require('../helpers/error-messages');
const Validation = require('../schemas/index');

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
  {include: catalogItem.picture}, transaction);

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
  // TODO: update changeTracking

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
    await IOFogService.getFogWithTransaction({
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
    await _updateChangeTracking(microserviceData, )
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
  // TODO: update changeTracking
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

const _updateChangeTracking = async function (microserviceData, fogNodeUuid, transaction) {
  const trackingData = {
    containerList: true,
    containerConfig: microserviceData.config ? true : false,
    iofogUuid: fogNodeUuid
  };

  await ChangeTrackingManager.create(trackingData, transaction);
};

const _deleteMicroservice = async function (microserviceUuid, user, transaction) {
  // TODO: update changeTracking

  const affectedRows = await MicroserviceManager.delete({
    uuid: microserviceUuid
  }, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid));
  }
};

module.exports = {
  createMicroserviceOnFog: TransactionDecorator.generateTransaction(_createMicroserviceOnFog),
  getMicroserviceByFlow: TransactionDecorator.generateTransaction(_getMicroserviceByFlow),
  getMicroservice: TransactionDecorator.generateTransaction(_getMicroservice),
  updateMicroservice: TransactionDecorator.generateTransaction(_updateMicroservice),
  deleteMicroservice: TransactionDecorator.generateTransaction(_deleteMicroservice)
};
