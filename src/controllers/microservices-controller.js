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

  return await MicroservicesService.createMicroserviceOnFog(microservice, user, false)
};

const _getMicroserviceEndPoint = async function (req, user) {
  const microserviceUuid = req.params.uuid;

  logger.info("Microservice uuid:" + JSON.stringify(microserviceUuid));

  return await MicroservicesService.getMicroservice(microserviceUuid, user, false)
};

const _updateMicroserviceEndPoint = async function (req, user) {
  const microservice = req.body;
  const microserviceUuid = req.params.uuid;

  logger.info("Parameters: " + JSON.stringify(microservice));
  logger.info("Microservice uuid:" + JSON.stringify(microserviceUuid));

  return await MicroservicesService.updateMicroservice(microserviceUuid, microservice, user, false)
};

const _deleteMicroserviceEndPoint = async function (req, user) {
  const microserviceUuid = req.params.uuid;
  const microserviceData = req.body || {};
  logger.info("Microservice uuid:" + JSON.stringify(microserviceUuid));
  logger.info("Parameters: " + JSON.stringify(microserviceData));

  return await MicroservicesService.deleteMicroservice(microserviceUuid, microserviceData, user, false)
};

const _getMicroservicesByFlowEndPoint = async function (req, user) {
  const flowId = req.query.flowId;

  logger.info("Flow id:" + flowId);

  return await MicroservicesService.listMicroservices(flowId, user, false)
};

const _createMicroserviceRouteEndPoint = async function (req, user) {
  const sourceUuid = req.params.uuid;
  const distUuid = req.params.receiverUuid;
  logger.info(`Creating route from ${sourceUuid} to ${distUuid}`);
  return await MicroservicesService.createRoute(sourceUuid, distUuid, user, false)
}

const _deleteMicroserviceRouteEndPoint = async function (req, user) {
  const sourceUuid = req.params.uuid;
  const distUuid = req.params.receiverUuid;
  logger.info(`Creating route from ${sourceUuid} to ${distUuid}`);
  return await MicroservicesService.deleteRoute(sourceUuid, distUuid, user, false)
}

const _createMicroservicePortMappingEndPoint = async function (req, user) {
  const uuid = req.params.uuid;
  const portMappingData = req.body;
  logger.info(`Creating port mapping for ${uuid}`);
  return await MicroservicesService.createPortMapping(uuid, portMappingData, user, false)
}

const _deleteMicroservicePortMappingEndPoint = async function (req, user) {
  const uuid = req.params.uuid;
  const internalPort = req.params.internalPort;
  logger.info(`Deleting port mapping for ${uuid}`);
  return await MicroservicesService.deletePortMapping(uuid, internalPort, user, false)
}

const _listMicroservicePortMappingsEndPoint = async function (req, user) {
  const uuid = req.params.uuid;
  logger.info(`Getting all port mappings for ${uuid}`);
  const ports = await MicroservicesService.getMicroservicePortMappingList(uuid, user, false);
  return {
    ports: ports
  }
};

const _createMicroserviceVolumeMappingEndPoint = async function (req, user) {
  const microserviceUuid = req.params.uuid;
  const volumeMappingData = req.body;
  logger.info(`Creating volume mapping for ${microserviceUuid}`);
  const volumeMapping = await MicroservicesService.createVolumeMapping(microserviceUuid, volumeMappingData, user, false);
  return {
    id: volumeMapping.id
  }
};

const _listMicroserviceVolumeMappingsEndPoint = async function (req, user) {
  const uuid = req.params.uuid;
  logger.info(`Getting all volume mappings for ${uuid}`);
  return await MicroservicesService.listVolumeMappings(uuid, user, false);
};

const _deleteMicroserviceVolumeMappingEndPoint = async function (req, user) {
  const uuid = req.params.uuid;
  const id = req.params.id;
  logger.info(`Deleting volume mapping ${id} for ${uuid}`);
  return await MicroservicesService.deleteVolumeMapping(uuid, id, user, false);
};

module.exports = {
  createMicroservicesOnFogEndPoint: AuthDecorator.checkAuthToken(_createMicroservicesOnFogEndPoint),
  getMicroserviceEndPoint: AuthDecorator.checkAuthToken(_getMicroserviceEndPoint),
  updateMicroserviceEndPoint: AuthDecorator.checkAuthToken(_updateMicroserviceEndPoint),
  deleteMicroserviceEndPoint: AuthDecorator.checkAuthToken(_deleteMicroserviceEndPoint),
  getMicroservicesByFlowEndPoint: AuthDecorator.checkAuthToken(_getMicroservicesByFlowEndPoint),
  createMicroserviceRouteEndPoint: AuthDecorator.checkAuthToken(_createMicroserviceRouteEndPoint),
  deleteMicroserviceRouteEndPoint: AuthDecorator.checkAuthToken(_deleteMicroserviceRouteEndPoint),
  createMicroservicePortMappingEndPoint: AuthDecorator.checkAuthToken(_createMicroservicePortMappingEndPoint),
  deleteMicroservicePortMappingEndPoint: AuthDecorator.checkAuthToken(_deleteMicroservicePortMappingEndPoint),
  getMicroservicePortMappingListEndPoint: AuthDecorator.checkAuthToken(_listMicroservicePortMappingsEndPoint),
  createMicroserviceVolumeMappingEndPoint: AuthDecorator.checkAuthToken(_createMicroserviceVolumeMappingEndPoint),
  listMicroserviceVolumeMappingsEndPoint: AuthDecorator.checkAuthToken(_listMicroserviceVolumeMappingsEndPoint),
  deleteMicroserviceVolumeMappingEndPoint: AuthDecorator.checkAuthToken(_deleteMicroserviceVolumeMappingEndPoint)
};