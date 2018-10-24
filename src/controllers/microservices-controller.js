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

  return await MicroservicesService.createMicroserviceOnFogWithTransaction(microservice, user, false)
};

const _getMicroserviceEndPoint = async function (req, user) {
  const microserviceUuid = req.params.uuid;

  logger.info("Microservice uuid:" + JSON.stringify(microserviceUuid))

  return await MicroservicesService.getMicroserviceWithTransaction(microserviceUuid, user, false)
};

const _updateMicroserviceEndPoint = async function (req, user) {
  const microservice = req.body;
  const microserviceUuid = req.params.uuid;

  logger.info("Parameters:" + JSON.stringify(microservice))
  logger.info("Microservice uuid:" + JSON.stringify(microserviceUuid))

  return await MicroservicesService.updateMicroserviceWithTransaction(microserviceUuid, microservice, user, false)
};

const _deleteMicroserviceEndPoint = async function (req, user) {
  const microserviceUuid = req.params.uuid;
  const deleteWithCleanUp = req.query.withCleanUp;

  logger.info("Microservice uuid:" + JSON.stringify(microserviceUuid))

  return await MicroservicesService.deleteMicroserviceWithTransaction(microserviceUuid, deleteWithCleanUp, user, false)
};

const _getMicroservicesByFlowEndPoint = async function (req, user) {
  const flowId = req.query.flowId;

  logger.info("Flow id:" + JSON.stringify(flowId))

  return await MicroservicesService.getMicroserviceByFlowWithTransaction(flowId, user, false)
};

async function _createMicroserviceRoute(req, user) {
  const sourceUuid = req.params.uuid
  const distUuid = req.params.receiverUuid
  logger.info(`Creating route from ${sourceUuid} to ${distUuid}`)
  return await MicroservicesService.createRouteWithTransaction(sourceUuid, distUuid, user)
}

async function _deleteMicroserviceRoute(req, user) {
  const sourceUuid = req.params.uuid
  const distUuid = req.params.receiverUuid
  logger.info(`Creating route from ${sourceUuid} to ${distUuid}`)
  return await MicroservicesService.deleteRouteWithTransaction(sourceUuid, distUuid, user)
}

async function _createMicroservicePortMapping(req, user) {
  const uuid = req.params.uuid
  const portMappingData = req.body
  logger.info(`Creating port mapping for ${uuid}`)
  return await MicroservicesService.createPortMappingWithTransaction(uuid, portMappingData, user)
}

async function _deleteMicroservicePortMapping(req, user) {
  const uuid = req.params.uuid
  const internalPort = req.params.internalPort
  logger.info(`Creating port mapping for ${uuid}`)
  return await MicroservicesService.deletePortMappingWithTransaction(uuid, internalPort, user)
}

module.exports = {
  createMicroservicesOnFogEndPoint: AuthDecorator.checkAuthToken(_createMicroservicesOnFogEndPoint),
  getMicroserviceEndPoint: AuthDecorator.checkAuthToken(_getMicroserviceEndPoint),
  updateMicroserviceEndPoint: AuthDecorator.checkAuthToken(_updateMicroserviceEndPoint),
  deleteMicroserviceEndPoint: AuthDecorator.checkAuthToken(_deleteMicroserviceEndPoint),
  getMicroservicesByFlowEndPoint: AuthDecorator.checkAuthToken(_getMicroservicesByFlowEndPoint),
  createMicroserviceRoute: AuthDecorator.checkAuthToken(_createMicroserviceRoute),
  deleteMicroserviceRoute: AuthDecorator.checkAuthToken(_deleteMicroserviceRoute),
  createMicroservicePortMapping: AuthDecorator.checkAuthToken(_createMicroservicePortMapping),
  deleteMicroservicePortMapping: AuthDecorator.checkAuthToken(_deleteMicroservicePortMapping)
};