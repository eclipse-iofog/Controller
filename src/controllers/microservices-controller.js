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
const MicroservicesService = require('../services/micriservices-service');
const Validation = require('../schemas');

const _createMicroservicesOnFogEndPoint = async function (req, user) {
  const microservice = req.body;
  await Validation.validate(microservice, Validation.schemas.microservice);

  logger.info("Parameters:" + JSON.stringify(microservice));

  return await MicroservicesService.createMicroserviceOnFog(microservice, user)
};

const _getMicroserviceEndPoint = async function (req, user) {
  const microserviceId = req.params.id;

  logger.info("Microservice id:" + JSON.stringify(microserviceId))

  return await MicroservicesService.getMicroservice(microserviceId, user)
};

const _updateMicroserviceEndPoint = async function (req, user) {
  const microservice = req.body;
  const microserviceId = req.params.id;

  await Validation.validate(microservice, Validation.schemas.microservice);

  logger.info("Parameters:" + JSON.stringify(microservice))
  logger.info("Microservice id:" + JSON.stringify(microserviceId))

  return await MicroservicesService.updateMicroservice(microservice, microserviceId, user)
};

const _deleteMicroserviceEndPoint = async function (req, user) {
  const microserviceId = req.params.id;

  logger.info("Microservice id:" + JSON.stringify(microserviceId))

  return await MicroservicesService.deleteMicroservice(microserviceId, user)
};

const _getMicroservicesByFlowEndPoint = async function (req, user) {
  const flowId = req.body;

  logger.info("Flow id:" + JSON.stringify(flowId))

  return await MicroservicesService.getMicroserviceByFlow(flowId, user)
};

module.exports = {
  createMicroservicesOnFogEndPoint: AuthDecorator.checkAuthToken(_createMicroservicesOnFogEndPoint),
  getMicroservicesByFlowEndPoint: AuthDecorator.checkAuthToken(_getMicroservicesByFlowEndPoint),
  getMicroserviceEndPoint: AuthDecorator.checkAuthToken(_getMicroserviceEndPoint),
  updateMicroserviceEndPoint: AuthDecorator.checkAuthToken(_updateMicroserviceEndPoint),
  deleteMicroserviceEndPoint: AuthDecorator.checkAuthToken(_deleteMicroserviceEndPoint),
};