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
const IOFogService = require('../services/iofog-service');
const FlowService = require('../services/flow-service');
const CatalogItemService = require('../services/catalog-service');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const Op = require('sequelize').Op;
const Validation = require('../schemas/index');

const _getMicroserviceByFlow = async function (flowId, user, transaction) {
  await FlowService.getFlow(flowId, user);

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

  //const catalogItem = CatalogItemService.listCatalogItem(microservice.catalogItemId, user, false, transaction);
  //microservice.images = catalogItem.images;
  //microservice.picture = catalogItem.picture;

  await FlowService.getFlow(microservice.flowId, user);

  await IOFogService.getFogWithTransaction({
    uuid: microservice.iofogUuid
  }, user);

  return microservice;
};

const _createMicroserviceOnFog = async function (microserviceData, user, transaction) {
  await Validation.validate(microserviceData, Validation.schemas.microservice);

  const microservice = await _createMicroservice(microserviceData, user, transaction);

  await _createMicroservicePort(microserviceData, microservice.uuid, transaction);

  return {
    uuid: microservice.uuid
  }
};

const _createMicroservice = async function (microserviceData, user, transaction) {
  const microserviceToCreate = {
    uuid: AppHelper.generateRandomString(32),
    name: microserviceData.name,
    config: microserviceData.config,
    catalogItemId: microserviceData.catalogItemId,
    flowId: microserviceData.flowId,
    iofogUuid: microserviceData.ioFogNodeId,
    volumeMappings: microserviceData.volumeMappings,
    rootHostAccess: microserviceData.rootHostAccess,
    strace: microserviceData.strace,
    logLimit: microserviceData.logLimit,
    routes: microserviceData.routes
  };

  const microserviceDataCreate = AppHelper.deleteUndefinedFields(microserviceToCreate);

  if (microserviceDataCreate.flowId) {
    await FlowService.getFlow(microserviceDataCreate.flowId, user);
  }

  if (microserviceDataCreate.iofogUuid) {
    await IOFogService.getFogWithTransaction({
      uuid: microserviceDataCreate.iofogUuid
    }, user);
  }

  return await MicroserviceManager.create(microserviceDataCreate, transaction);
};

const _createMicroservicePort = async function (microserviceData, microserviceUuid, transaction) {
  const microservicePortToCreate = {
    internal: microserviceData.ports.internal,
    external: microserviceData.ports.external,
    tunnel: microserviceData.ports.tunnel,
    microserviceUuid: microserviceUuid
  };

  const microservicePortDataCreate = AppHelper.deleteUndefinedFields(microservicePortToCreate);

  await MicroservicePortManager.create(microservicePortDataCreate, transaction);
};

const _updateMicroservice = async function (microserviceUuid, microserviceData, user, transaction) {
  await Validation.validate(microserviceData, Validation.schemas.microservice);

  const microserviceToUpdate = {
    name: microserviceData.name,
    config: microserviceData.config,
    catalogItemId: microserviceData.catalogItemId,
    flowId: microserviceData.flowId,
    iofogUuid: microserviceData.ioFogNodeId,
    volumeMappings: microserviceData.volumeMappings,
    rootHostAccess: microserviceData.rootHostAccess,
    strace: microserviceData.strace,
    logLimit: microserviceData.logLimit,
    routes: microserviceData.routes,
    updatedBy: user.id
  };

  const microserviceDataUpdate = AppHelper.deleteUndefinedFields(microserviceToUpdate);

  if (microserviceDataUpdate.flowId) {
    await FlowService.getFlow(microserviceDataUpdate.flowId, user);
  }

  if (microserviceDataUpdate.iofogUuid) {
    await IOFogService.getFogWithTransaction({
      uuid: microserviceDataUpdate.iofogUuid
    }, user);
  }

  const affectedRows = await MicroserviceManager.update({
    uuid: microserviceUuid
  }, microserviceDataUpdate, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError("Invalid microservice uuid");
  }

  await _updateMicroservicePort(microserviceId, microserviceData, transaction);
};

const _updateMicroservicePort = async function (microserviceUuid, microserviceData, user, transaction) {
  const microservicePortToUpdate = {
    internal: microserviceData.ports.internal,
    external: microserviceData.ports.external,
    tunnel: microserviceData.ports.tunnel,
    updatedBy: user.id
  };

  const microservicePortDataUpdate = AppHelper.deleteUndefinedFields(microservicePortToUpdate);
  const affectedRows = await MicroserviceManager.update({
    microserviceUuid: microserviceUuid
  }, microservicePortDataUpdate, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError("Invalid microservice uuid");
  }
};

const _deleteMicroservice = async function (microserviceUuid, user, transaction) {
  const microservice = _getMicroservice(microserviceUuid, user, transaction);
  if (!microservice){
    throw new Errors.NotFoundError("Invalid microservice uuid");
  }

  const affectedRows = await MicroserviceManager.delete({
    uuid: microserviceUuid
  }, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError("Invalid microservice uuid");
  }
};

module.exports = {
  createMicroserviceOnFog: TransactionDecorator.generateTransaction(_createMicroserviceOnFog),
  getMicroserviceByFlow: TransactionDecorator.generateTransaction(_getMicroserviceByFlow),
  getMicroservice: TransactionDecorator.generateTransaction(_getMicroservice),
  updateMicroservice: TransactionDecorator.generateTransaction(_updateMicroservice),
  deleteMicroservice: TransactionDecorator.generateTransaction(_deleteMicroservice)
};
