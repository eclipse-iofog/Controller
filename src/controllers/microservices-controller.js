/*
 * *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const MicroservicesService = require('../services/microservices-service')
const YAMLParserService = require('../services/yaml-parser-service')
const { rvaluesVarSubstition } = require('../helpers/template-helper')

const createMicroserviceOnFogEndPoint = async function (req) {
  const microservice = req.body
  return MicroservicesService.createMicroserviceEndPoint(microservice, false)
}

const createMicroserviceYAMLEndPoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const microservice = await YAMLParserService.parseMicroserviceFile(fileContent)
  await rvaluesVarSubstition(microservice, { self: microservice })
  return MicroservicesService.createMicroserviceEndPoint(microservice, false)
}

const getMicroserviceEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  return MicroservicesService.getMicroserviceEndPoint(microserviceUuid, false)
}

const getSystemMicroserviceEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  return MicroservicesService.getSystemMicroserviceEndPoint(microserviceUuid, false)
}

const updateMicroserviceEndPoint = async function (req) {
  const microservice = req.body
  const microserviceUuid = req.params.uuid
  return MicroservicesService.updateMicroserviceEndPoint(microserviceUuid, microservice, false)
}

const updateSystemMicroserviceEndPoint = async function (req) {
  const microservice = req.body
  const microserviceUuid = req.params.uuid
  return MicroservicesService.updateSystemMicroserviceEndPoint(microserviceUuid, microservice, false)
}

const rebuildMicroserviceEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  return MicroservicesService.rebuildMicroserviceEndPoint(microserviceUuid, false)
}

const rebuildSystemMicroserviceEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  return MicroservicesService.rebuildSystemMicroserviceEndPoint(microserviceUuid, false)
}

const updateMicroserviceYAMLEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  const fileContent = req.file.buffer.toString()
  const microservice = await YAMLParserService.parseMicroserviceFile(fileContent)
  await rvaluesVarSubstition(microservice, { self: microservice })
  return MicroservicesService.updateMicroserviceEndPoint(microserviceUuid, microservice, false)
}

const updateSystemMicroserviceYAMLEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  const fileContent = req.file.buffer.toString()
  const microservice = await YAMLParserService.parseMicroserviceFile(fileContent)
  await rvaluesVarSubstition(microservice, { self: microservice })
  return MicroservicesService.updateSystemMicroserviceEndPoint(microserviceUuid, microservice, false)
}

const updateMicroserviceConfigEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  const config = req.body
  return MicroservicesService.updateMicroserviceConfigEndPoint(microserviceUuid, config, false)
}

const getMicroserviceConfigEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  return MicroservicesService.getMicroserviceConfigEndPoint(microserviceUuid, false)
}

const deleteMicroserviceConfigEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  return MicroservicesService.deleteMicroserviceConfigEndPoint(microserviceUuid, false)
}

const updateSystemMicroserviceConfigEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  const config = req.body
  return MicroservicesService.updateSystemMicroserviceConfigEndPoint(microserviceUuid, config, false)
}

const getSystemMicroserviceConfigEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  return MicroservicesService.getSystemMicroserviceConfigEndPoint(microserviceUuid, false)
}

const deleteSystemMicroserviceConfigEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  return MicroservicesService.deleteSystemMicroserviceConfigEndPoint(microserviceUuid, false)
}

const deleteMicroserviceEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  const microserviceData = req.body || {}
  return MicroservicesService.deleteMicroserviceEndPoint(microserviceUuid, microserviceData, false)
}

const getMicroservicesByApplicationEndPoint = async function (req) {
  // API Retro compatibility
  const flowId = req.query.flowId

  const applicationName = req.query.application
  return MicroservicesService.listMicroservicesEndPoint({ applicationName, flowId }, false)
}

const getSystemMicroservicesByApplicationEndPoint = async function (req) {
  // API Retro compatibility
  const flowId = req.query.flowId

  const applicationName = req.query.application
  return MicroservicesService.listSystemMicroservicesEndPoint({ applicationName, flowId }, false)
}

const createMicroservicePortMappingEndPoint = async function (req) {
  const uuid = req.params.uuid
  const portMappingData = req.body
  return MicroservicesService.createPortMappingEndPoint(uuid, portMappingData, false)
}

const createSystemMicroservicePortMappingEndPoint = async function (req) {
  const uuid = req.params.uuid
  const portMappingData = req.body
  return MicroservicesService.createSystemPortMappingEndPoint(uuid, portMappingData, false)
}

const deleteMicroservicePortMappingEndPoint = async function (req) {
  const uuid = req.params.uuid
  const internalPort = req.params.internalPort
  return MicroservicesService.deletePortMappingEndPoint(uuid, internalPort, false)
}

const deleteSystemMicroservicePortMappingEndPoint = async function (req) {
  const uuid = req.params.uuid
  const internalPort = req.params.internalPort
  return MicroservicesService.deleteSystemPortMappingEndPoint(uuid, internalPort, false)
}

const listMicroservicePortMappingsEndPoint = async function (req) {
  const uuid = req.params.uuid
  const ports = await MicroservicesService.listMicroservicePortMappingsEndPoint(uuid, false)
  return {
    ports: ports
  }
}

const createMicroserviceVolumeMappingEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  const volumeMappingData = req.body
  const volumeMapping = await MicroservicesService.createVolumeMappingEndPoint(microserviceUuid, volumeMappingData, false)
  return {
    id: volumeMapping.id
  }
}

const createSystemMicroserviceVolumeMappingEndPoint = async function (req) {
  const microserviceUuid = req.params.uuid
  const volumeMappingData = req.body
  const volumeMapping = await MicroservicesService.createSystemVolumeMappingEndPoint(microserviceUuid, volumeMappingData, false)
  return {
    id: volumeMapping.id
  }
}

const listMicroserviceVolumeMappingsEndPoint = async function (req) {
  const uuid = req.params.uuid
  const volumeMappings = await MicroservicesService.listVolumeMappingsEndPoint(uuid, false)
  return {
    volumeMappings: volumeMappings
  }
}

const deleteMicroserviceVolumeMappingEndPoint = async function (req) {
  const uuid = req.params.uuid
  const id = req.params.id
  return MicroservicesService.deleteVolumeMappingEndPoint(uuid, id, false)
}

const deleteSystemMicroserviceVolumeMappingEndPoint = async function (req) {
  const uuid = req.params.uuid
  const id = req.params.id
  return MicroservicesService.deleteSystemVolumeMappingEndPoint(uuid, id, false)
}

const createMicroserviceExecEndPoint = async function (req) {
  const uuid = req.params.uuid
  return MicroservicesService.createExecEndPoint(uuid, false)
}

const deleteMicroserviceExecEndPoint = async function (req) {
  const uuid = req.params.uuid
  return MicroservicesService.deleteExecEndPoint(uuid, false)
}

const createSystemMicroserviceExecEndPoint = async function (req) {
  const uuid = req.params.uuid
  return MicroservicesService.createSystemExecEndPoint(uuid, false)
}

const deleteSystemMicroserviceExecEndPoint = async function (req) {
  const uuid = req.params.uuid
  return MicroservicesService.deleteSystemExecEndPoint(uuid, false)
}

const startMicroserviceEndPoint = async function (req) {
  const uuid = req.params.uuid
  return MicroservicesService.startMicroserviceEndPoint(uuid, false)
}

const stopMicroserviceEndPoint = async function (req) {
  const uuid = req.params.uuid
  return MicroservicesService.stopMicroserviceEndPoint(uuid, false)
}

module.exports = {
  createMicroserviceOnFogEndPoint: (createMicroserviceOnFogEndPoint),
  getMicroserviceEndPoint: (getMicroserviceEndPoint),
  getSystemMicroserviceEndPoint: (getSystemMicroserviceEndPoint),
  updateMicroserviceEndPoint: (updateMicroserviceEndPoint),
  updateSystemMicroserviceEndPoint: (updateSystemMicroserviceEndPoint),
  rebuildMicroserviceEndPoint: (rebuildMicroserviceEndPoint),
  rebuildSystemMicroserviceEndPoint: (rebuildSystemMicroserviceEndPoint),
  deleteMicroserviceEndPoint: (deleteMicroserviceEndPoint),
  getMicroservicesByApplicationEndPoint: (getMicroservicesByApplicationEndPoint),
  getSystemMicroservicesByApplicationEndPoint: (getSystemMicroservicesByApplicationEndPoint),
  createMicroservicePortMappingEndPoint: (createMicroservicePortMappingEndPoint),
  createSystemMicroservicePortMappingEndPoint: (createSystemMicroservicePortMappingEndPoint),
  deleteMicroservicePortMappingEndPoint: (deleteMicroservicePortMappingEndPoint),
  deleteSystemMicroservicePortMappingEndPoint: (deleteSystemMicroservicePortMappingEndPoint),
  getMicroservicePortMappingListEndPoint: (listMicroservicePortMappingsEndPoint),
  createMicroserviceVolumeMappingEndPoint: (createMicroserviceVolumeMappingEndPoint),
  createSystemMicroserviceVolumeMappingEndPoint: (createSystemMicroserviceVolumeMappingEndPoint),
  listMicroserviceVolumeMappingsEndPoint: (listMicroserviceVolumeMappingsEndPoint),
  deleteMicroserviceVolumeMappingEndPoint: (deleteMicroserviceVolumeMappingEndPoint),
  deleteSystemMicroserviceVolumeMappingEndPoint: (deleteSystemMicroserviceVolumeMappingEndPoint),
  createMicroserviceYAMLEndPoint: (createMicroserviceYAMLEndPoint),
  updateMicroserviceYAMLEndPoint: (updateMicroserviceYAMLEndPoint),
  updateSystemMicroserviceYAMLEndPoint: (updateSystemMicroserviceYAMLEndPoint),
  updateMicroserviceConfigEndPoint: (updateMicroserviceConfigEndPoint),
  getMicroserviceConfigEndPoint: (getMicroserviceConfigEndPoint),
  updateSystemMicroserviceConfigEndPoint: (updateSystemMicroserviceConfigEndPoint),
  getSystemMicroserviceConfigEndPoint: (getSystemMicroserviceConfigEndPoint),
  deleteMicroserviceConfigEndPoint: (deleteMicroserviceConfigEndPoint),
  deleteSystemMicroserviceConfigEndPoint: (deleteSystemMicroserviceConfigEndPoint),
  createMicroserviceExecEndPoint: (createMicroserviceExecEndPoint),
  deleteMicroserviceExecEndPoint: (deleteMicroserviceExecEndPoint),
  createSystemMicroserviceExecEndPoint: (createSystemMicroserviceExecEndPoint),
  deleteSystemMicroserviceExecEndPoint: (deleteSystemMicroserviceExecEndPoint),
  startMicroserviceEndPoint: (startMicroserviceEndPoint),
  stopMicroserviceEndPoint: (stopMicroserviceEndPoint)
}
