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
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const Op = require('sequelize').Op;
const Validation = require('../schemas/index');

const _getMicroserviceByFlow = async function (flowId, user, transaction) {
  const flow = await FlowService.getFlow(flowId, user);

  if (!flow){
    throw new Errors.ValidationError("Bad Request: Flow doesn't exists")
  }

  const microservice = {
    flowId: flowId
  };

  return await MicroserviceManager.findAllWithDependencies(microservice, transaction)
};

const _getMicroservice = async function (microserviceId, user, transaction) {
  const microservice = await MicroserviceManager.findOneWithDependencies({
    id: microserviceId
  }, transaction);

  const flow = await FlowService.getFlow(microservice.flowId, user);

  const fogNode = await IOFogService.getFogWithTransaction({
    uuid: microserviceDataUpdate.ioFogNodeId
  }, user);

  if(!flow || !fogNode){
    throw new Errors.NotFoundError();
  }

  return microservice;
};

const _createMicroserviceOnFog = async function (microserviceData, user, transaction) {
  await Validation.validate(microserviceData, Validation.schemas.microservice);

  const microservice = await _createMicroservice(microserviceData, user, transaction);

  await _createMicroservicePort(microserviceData, microservice.id, transaction);

  return {
    id: microservice.id
  }
};

const _createMicroservice = async function (microserviceData, user, transaction) {
  const microserviceToCreate = {
    name: microserviceData.name,
    config: microserviceData.config,
    catalogItemId: microserviceData.catalogItemId,
    flowId: microserviceData.flowId,
    ioFogNodeId: microserviceData.ioFogNodeId,
    volumeMappings: microserviceData.volumeMappings,
    rootHostAccess: microserviceData.rootHostAccess,
    strace: microserviceData.strace,
    logLimit: microserviceData.logLimit,
    routes: microserviceData.routes
  };

  const microserviceDataCreate = AppHelper.deleteUndefinedFields(microserviceToCreate);

  if (microserviceDataCreate.flowId) {
    await FlowService.getFlow(microserviceDataUpdate.flowId, user);
  }

  if (microserviceDataCreate.ioFogNodeId) {
    await IOFogService.getFogWithTransaction({
      uuid: microserviceDataUpdate.ioFogNodeId
    }, user);
  }

  return await MicroserviceManager.create(microserviceDataCreate, transaction);
};

const _createMicroservicePort = async function (microserviceData, microserviceId, transaction) {
  const microservicePortToCreate = {
    internal: microserviceData.ports.internal,
    external: microserviceData.ports.external,
    tunnel: microserviceData.ports.tunnel,
    microserviceUuid: microserviceId
  };

  const microservicePortDataCreate = AppHelper.deleteUndefinedFields(microservicePortToCreate);

  await MicroservicePortManager.create(microservicePortDataCreate, transaction);
};

const _updateMicroservice = async function (microserviceId, microserviceData, user, transaction) {
  await Validation.validate(microserviceData, Validation.schemas.microservice);

  const microserviceToUpdate = {
    name: microserviceData.name,
    config: microserviceData.config,
    catalogItemId: microserviceData.catalogItemId,
    flowId: microserviceData.flowId,
    ioFogNodeId: microserviceData.ioFogNodeId,
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

  if (microserviceDataUpdate.ioFogNodeId) {
    await IOFogService.getFogWithTransaction({
      uuid: microserviceDataUpdate.ioFogNodeId
    }, user);
  }

  const affectedRows = await MicroserviceManager.update({
    id: microserviceId
  }, microserviceDataUpdate, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError("Invalid microservice id");
  }

  await _updateMicroservicePort(microserviceId, microserviceData, transaction);
};

const _updateMicroservicePort = async function (microserviceId, microserviceData, user, transaction) {
  const microservicePortToUpdate = {
    internal: microserviceData.ports.internal,
    external: microserviceData.ports.external,
    tunnel: microserviceData.ports.tunnel,
    updatedBy: user.id
  };

  const microservicePortDataUpdate = AppHelper.deleteUndefinedFields(microservicePortToUpdate);
  const affectedRows = await MicroserviceManager.update({
    microserviceUuid: microserviceId
  }, microservicePortDataUpdate, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError("Invalid microservice id");
  }
};

const _deleteMicroservice = async function (microserviceId, user, transaction) {
  const affectedRows = await MicroserviceManager.delete({
    id: microserviceId
  }, transaction);
  if (affectedRows === 0) {
    throw new Errors.NotFoundError("Invalid microservice id");
  }
};

module.exports = {
  createMicroserviceOnFog: TransactionDecorator.generateTransaction(_createMicroserviceOnFog),
  getMicroserviceByFlow: TransactionDecorator.generateTransaction(_getMicroserviceByFlow),
  getMicroservice: TransactionDecorator.generateTransaction(_getMicroservice),
  updateMicroservice: TransactionDecorator.generateTransaction(_updateMicroservice),
  deleteMicroservice: TransactionDecorator.generateTransaction(_deleteMicroservice)
};
