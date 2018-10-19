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

const logger = require('../logger');
const AuthDecorator = require('./../decorators/authorization-decorator');
const MicroservicesService = require('../services/microservices-service');

const _createMicroservicesOnFogEndPoint = async function (req, user) {
  const microservice = req.body;

  logger.info("Parameters:" + JSON.stringify(microservice));

  return await MicroservicesService.createMicroserviceOnFog(microservice, user)
};

const _getMicroserviceEndPoint = async function (req, user) {
  const microserviceUuid = req.params.uuid;

  logger.info("Microservice uuid:" + JSON.stringify(microserviceUuid))

  return await MicroservicesService.getMicroservice(microserviceUuid, user)
};

const _updateMicroserviceEndPoint = async function (req, user) {
  const microservice = req.body;
  const microserviceUuid = req.params.uuid;

  logger.info("Parameters:" + JSON.stringify(microservice))
  logger.info("Microservice uuid:" + JSON.stringify(microserviceUuid))

  return await MicroservicesService.updateMicroservice(microserviceUuid, microservice, user)
};

const _deleteMicroserviceEndPoint = async function (req, user) {
  const microserviceUuid = req.params.uuid;

  logger.info("Microservice uuid:" + JSON.stringify(microserviceUuid))

  return await MicroservicesService.deleteMicroservice(microserviceUuid, user)
};

const _getMicroservicesByFlowEndPoint = async function (req, user) {
  const flowId = req.query.flowId;

  logger.info("Flow id:" + JSON.stringify(flowId))

  return await MicroservicesService.getMicroserviceByFlow(flowId, user)
};

module.exports = {
  createMicroservicesOnFogEndPoint: AuthDecorator.checkAuthToken(_createMicroservicesOnFogEndPoint),
  getMicroserviceEndPoint: AuthDecorator.checkAuthToken(_getMicroserviceEndPoint),
  updateMicroserviceEndPoint: AuthDecorator.checkAuthToken(_updateMicroserviceEndPoint),
  deleteMicroserviceEndPoint: AuthDecorator.checkAuthToken(_deleteMicroserviceEndPoint),
  getMicroservicesByFlowEndPoint: AuthDecorator.checkAuthToken(_getMicroservicesByFlowEndPoint)
};