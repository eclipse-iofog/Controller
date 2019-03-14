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

const AuthDecorator = require('./../decorators/authorization-decorator')
const MicroservicesService = require('../services/microservices-service')

const createMicroserviceOnFogEndPoint = async function(req, user) {
  const microservice = req.body
  return await MicroservicesService.createMicroserviceEndPoint(microservice, user, false)
}

const getMicroserviceEndPoint = async function(req, user) {
  const microserviceUuid = req.params.uuid
  return await MicroservicesService.getMicroserviceEndPoint(microserviceUuid, user, false)
}

const updateMicroserviceEndPoint = async function(req, user) {
  const microservice = req.body
  const microserviceUuid = req.params.uuid
  return await MicroservicesService.updateMicroserviceEndPoint(microserviceUuid, microservice, user, false)
}

const deleteMicroserviceEndPoint = async function(req, user) {
  const microserviceUuid = req.params.uuid
  const microserviceData = req.body || {}
  return await MicroservicesService.deleteMicroserviceEndPoint(microserviceUuid, microserviceData, user, false)
}

const getMicroservicesByFlowEndPoint = async function(req, user) {
  const flowId = req.query.flowId
  return await MicroservicesService.listMicroservicesEndPoint(flowId, user, false)
}

const createMicroserviceRouteEndPoint = async function(req, user) {
  const sourceUuid = req.params.uuid
  const destUuid = req.params.receiverUuid
  return await MicroservicesService.createRouteEndPoint(sourceUuid, destUuid, user, false)
}

const deleteMicroserviceRouteEndPoint = async function(req, user) {
  const sourceUuid = req.params.uuid
  const destUuid = req.params.receiverUuid
  return await MicroservicesService.deleteRouteEndPoint(sourceUuid, destUuid, user, false)
}

const createMicroservicePortMappingEndPoint = async function(req, user) {
  const uuid = req.params.uuid
  const portMappingData = req.body
  return await MicroservicesService.createPortMappingEndPoint(uuid, portMappingData, user, false)
}

const deleteMicroservicePortMappingEndPoint = async function(req, user) {
  const uuid = req.params.uuid
  const internalPort = req.params.internalPort
  return await MicroservicesService.deletePortMappingEndPoint(uuid, internalPort, user, false)
}

const listMicroservicePortMappingsEndPoint = async function(req, user) {
  const uuid = req.params.uuid
  const ports = await MicroservicesService.listMicroservicePortMappingsEndPoint(uuid, user, false)
  return {
    ports: ports,
  }
}

const createMicroserviceVolumeMappingEndPoint = async function(req, user) {
  const microserviceUuid = req.params.uuid
  const volumeMappingData = req.body
  const volumeMapping = await MicroservicesService.createVolumeMappingEndPoint(microserviceUuid, volumeMappingData, user, false)
  return {
    id: volumeMapping.id,
  }
}

const listMicroserviceVolumeMappingsEndPoint = async function(req, user) {
  const uuid = req.params.uuid
  const volumeMappings = await MicroservicesService.listVolumeMappingsEndPoint(uuid, user, false)
  return {
    volumeMappings: volumeMappings,
  }
}

const deleteMicroserviceVolumeMappingEndPoint = async function(req, user) {
  const uuid = req.params.uuid
  const id = req.params.id
  return await MicroservicesService.deleteVolumeMappingEndPoint(uuid, id, user, false)
}

module.exports = {
  createMicroserviceOnFogEndPoint: AuthDecorator.checkAuthToken(createMicroserviceOnFogEndPoint),
  getMicroserviceEndPoint: AuthDecorator.checkAuthToken(getMicroserviceEndPoint),
  updateMicroserviceEndPoint: AuthDecorator.checkAuthToken(updateMicroserviceEndPoint),
  deleteMicroserviceEndPoint: AuthDecorator.checkAuthToken(deleteMicroserviceEndPoint),
  getMicroservicesByFlowEndPoint: AuthDecorator.checkAuthToken(getMicroservicesByFlowEndPoint),
  createMicroserviceRouteEndPoint: AuthDecorator.checkAuthToken(createMicroserviceRouteEndPoint),
  deleteMicroserviceRouteEndPoint: AuthDecorator.checkAuthToken(deleteMicroserviceRouteEndPoint),
  createMicroservicePortMappingEndPoint: AuthDecorator.checkAuthToken(createMicroservicePortMappingEndPoint),
  deleteMicroservicePortMappingEndPoint: AuthDecorator.checkAuthToken(deleteMicroservicePortMappingEndPoint),
  getMicroservicePortMappingListEndPoint: AuthDecorator.checkAuthToken(listMicroservicePortMappingsEndPoint),
  createMicroserviceVolumeMappingEndPoint: AuthDecorator.checkAuthToken(createMicroserviceVolumeMappingEndPoint),
  listMicroserviceVolumeMappingsEndPoint: AuthDecorator.checkAuthToken(listMicroserviceVolumeMappingsEndPoint),
  deleteMicroserviceVolumeMappingEndPoint: AuthDecorator.checkAuthToken(deleteMicroserviceVolumeMappingEndPoint),
}
