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
const MicroservicePortManager = require('../sequelize/managers/microserviceport-manager');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');

const _getMicroserviceByFlow = async function (flowId, user, transaction) {
  const flow = await FlowManager.findOne({
    userId: user.id,
    id: flowId
  }, transaction);

  if (!flow){
    throw new Errors.ValidationError("Bad Request: Flow doesn't exists")
  }

  const microservice = {
    flowId: flowId
  };

  //TODO: add info about ports

  return await MicroserviceManager.findAll(microservice, transaction)
};

const _getMicroservice = async function (microserviceId, user, transaction) {

};

const _createMicroserviceOnFog = async function (microserviceData, user, transaction) {
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

  const microservice = await MicroserviceManager.create(microserviceDataCreate, transaction);

  const microservicePortToCreate = {
    internal: microserviceData.ports.internal,
    external: microserviceData.ports.external,
    tunnel: microserviceData.ports.tunnel,
    microserviceUuid: microservice.id
  };

  const microservicePortDataCreate = AppHelper.deleteUndefinedFields(microservicePortToCreate);

  const microservicePort = await MicroservicePortManager.create(microservicePortDataCreate, transaction);

  if (!microservicePort){
    throw new Errors.ValidationError("Bad Request: Can't create ports for microservice")
  }

  return {
    id: microservice.id
  }
};

const _updateMicroservice = async function (microserviceId, microserviceData, user, transaction) {

};

const _deleteMicroservice = async function (microserviceId, user, transaction) {

};

module.exports = {
  createMicroserviceOnFog: TransactionDecorator.generateTransaction(_createMicroserviceOnFog),
  getMicroserviceByFlow: TransactionDecorator.generateTransaction(_getMicroserviceByFlow),
  getMicroservice: TransactionDecorator.generateTransaction(_getMicroservice),
  updateMicroservice: TransactionDecorator.generateTransaction(_updateMicroservice),
  deleteMicroservice: TransactionDecorator.generateTransaction(_deleteMicroservice)
};
