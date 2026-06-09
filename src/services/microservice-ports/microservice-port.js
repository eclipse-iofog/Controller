/* only "[a-zA-Z0-9][a-zA-Z0-9_.-]" are allowed
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

const MicroservicePortManager = require('../../data/managers/microservice-port-manager')
const MicroserviceManager = require('../../data/managers/microservice-manager')
const ChangeTrackingService = require('../change-tracking-service')
const AppHelper = require('../../helpers/app-helper')
const Errors = require('../../helpers/errors')
const ErrorMessages = require('../../helpers/error-messages')
const Op = require('sequelize').Op
const FogManager = require('../../data/managers/iofog-manager')

const { RESERVED_PORTS } = require('../../helpers/constants')

async function _checkForDuplicatePorts (agent, localPort, transaction) {
  if (RESERVED_PORTS.find(port => port === localPort)) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.PORT_RESERVED, localPort))
  }

  const microservices = await agent.getMicroservice()
  for (const microservice of microservices) {
    const ports = await microservice.getPorts()
    if (ports.find(port => port.portExternal === localPort)) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.PORT_NOT_AVAILABLE, localPort))
    }
  }
}

// Validate port and populate, mapping.localAgent
async function validatePortMapping (agent, mapping, transaction) {
  await _checkForDuplicatePorts(agent, mapping.external, transaction)
}

async function validatePortMappings (microserviceData, transaction) {
  if (!microserviceData.ports || microserviceData.ports.length === 0) {
    return
  }

  const localAgent = await FogManager.findOne({ uuid: microserviceData.iofogUuid }, transaction)
  if (!localAgent) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, microserviceData.iofogUuid))
  }

  // Will be filled by validatePortMapping
  for (const mapping of microserviceData.ports) {
    await validatePortMapping(localAgent, mapping, transaction)
  }
}

async function createPortMapping (microservice, portMappingData, transaction) {
  if (!microservice.iofogUuid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.REQUIRED_FOG_NODE))
  }

  const msPorts = await MicroservicePortManager.findOne({
    microserviceUuid: microservice.uuid,
    [Op.or]: []
  }, transaction)
  if (msPorts) {
    throw new Errors.ValidationError(ErrorMessages.PORT_MAPPING_ALREADY_EXISTS)
  }

  portMappingData.protocol = portMappingData.protocol || ''

  return _createSimplePortMapping(microservice, portMappingData, transaction)
}

async function _deletePortMapping (microservice, portMapping, transaction) {
  await _deleteSimplePortMapping(microservice, portMapping, transaction)
}

async function _createSimplePortMapping (microservice, portMappingData, transaction) {
  // create port mapping
  const mappingData = {
    portInternal: portMappingData.internal,
    portExternal: portMappingData.external,
    isUdp: portMappingData.protocol.toLowerCase() === 'udp',
    microserviceUuid: microservice.uuid
  }

  await MicroservicePortManager.create(mappingData, transaction)
  await switchOnUpdateFlagsForMicroservicesForPortMapping(microservice, transaction)
}

async function _deleteSimplePortMapping (microservice, msPorts, transaction) {
  await MicroservicePortManager.delete({ id: msPorts.id }, transaction)

  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({ uuid: microservice.uuid }, updateRebuildMs, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
}

async function _buildPortsList (portsPairs, transaction) {
  const res = []
  for (const ports of portsPairs) {
    const portMappingResponseData = {
      internal: ports.portInternal,
      external: ports.portExternal,
      protocol: ports.isUdp ? 'udp' : 'tcp'
    }
    res.push(portMappingResponseData)
  }
  return res
}

async function switchOnUpdateFlagsForMicroservicesForPortMapping (microservice, transaction) {
  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({ uuid: microservice.uuid }, updateRebuildMs, transaction)

  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
}

async function listPortMappings (microserviceUuid, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid }
  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  const portsPairs = await MicroservicePortManager.findAll({ microserviceUuid }, transaction)
  return _buildPortsList(portsPairs, transaction)
}

async function deletePortMapping (microserviceUuid, internalPort, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid }

  const microservice = await MicroserviceManager.findMicroserviceOnGet(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  if (!internalPort) {
    throw new Errors.ValidationError(ErrorMessages.PORT_MAPPING_INTERNAL_PORT_NOT_PROVIDED)
  }

  const msPorts = await MicroservicePortManager.findOne({
    microserviceUuid: microservice.uuid,
    portInternal: internalPort
  }, transaction)
  if (!msPorts) {
    throw new Errors.NotFoundError('port mapping not exists')
  }

  await _deletePortMapping(microservice, msPorts, transaction)
}

async function deleteSystemPortMapping (microserviceUuid, internalPort, isCLI, transaction) {
  const where = isCLI
    ? { uuid: microserviceUuid }
    : { uuid: microserviceUuid }

  const microservice = await MicroserviceManager.findOne(where, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }

  if (!internalPort) {
    throw new Errors.ValidationError(ErrorMessages.PORT_MAPPING_INTERNAL_PORT_NOT_PROVIDED)
  }

  const msPorts = await MicroservicePortManager.findOne({
    microserviceUuid: microservice.uuid,
    portInternal: internalPort
  }, transaction)
  if (!msPorts) {
    throw new Errors.NotFoundError('port mapping not exists')
  }

  await _deletePortMapping(microservice, msPorts, transaction)
}

async function deletePortMappings (microservice, transaction) {
  const portMappings = await MicroservicePortManager.findAll({ microserviceUuid: microservice.uuid }, transaction)
  for (const ports of portMappings) {
    await _deletePortMapping(microservice, ports, transaction)
  }
}

async function getPortMappings (microserviceUuid, transaction) {
  return MicroservicePortManager.findAll({ microserviceUuid }, transaction)
}

module.exports = {
  validatePortMappings,
  validatePortMapping,
  switchOnUpdateFlagsForMicroservicesForPortMapping,
  createPortMapping,
  listPortMappings,
  deletePortMapping,
  deleteSystemPortMapping,
  deletePortMappings,
  getPortMappings
}
