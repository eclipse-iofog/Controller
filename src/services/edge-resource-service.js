/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const EdgeResourceManager = require('../data/managers/edge-resource-manager')
const HTTPBasedResourceInterfaceManager = require('../data/managers/http-based-resource-interface-manager')
const HTTPBasedResourceInterfaceEndpointsManager = require('../data/managers/http-based-resource-interface-endpoints-manager')
const FogManager = require('../data/managers/iofog-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')

async function listEdgeResources (user, transaction) {
  const edgeResources = await EdgeResourceManager.findAll({ userId: user.id }, transaction)
  return edgeResources
}

async function getEdgeResource ({ name, version }, user, transaction) {
  const resource = await EdgeResourceManager.findOne({ name, version, userId: user.id }, transaction)
  if (!resource) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_RESOURCE_NAME_VERSION, name, version))
  }
  resource.interface = await getInterface(resource)
  return resource
}

async function getInterface (resource, transaction) {
  switch (resource.interfaceProtocol) {
    case 'http':
    case 'https':
    case 'ws':
    case 'wss': {
      return HTTPBasedResourceInterfaceManager.findOneWithEndpoints({ id: resource.interfaceId }, transaction)
    }
    default:
      break
  }
}

async function _createHttpBasedInterfaceEndpoints (endpoints, interfaceId, transaction) {
  for (const endpoint of endpoints) {
    await HTTPBasedResourceInterfaceEndpointsManager.create({ ...endpoint, interfaceId }, transaction)
  }
}

async function _createHttpBasedInterface (endpoints, resourceId, transaction) {
  const httpBasedInterface = await HTTPBasedResourceInterfaceManager.create({ resourceId }, transaction)
  await _createHttpBasedInterfaceEndpoints(endpoints, httpBasedInterface.id, transaction)
  return httpBasedInterface
}

async function _updateHttpBasedInterface (id, endpoints, transaction) {
  const httpBasedInterface = await HTTPBasedResourceInterfaceManager.findOneWithEndpoints({ id }, transaction)
  if (httpBasedInterface) {
    await HTTPBasedResourceInterfaceEndpointsManager.delete({ interfaceId: httpBasedInterface.id }, transaction)
    await _createHttpBasedInterfaceEndpoints(endpoints, id, transaction)
  }
}

async function _createInterface (resourceData, resourceId, transaction) {
  switch (resourceData.interfaceProtocol) {
    case 'http':
    case 'https':
    case 'ws':
    case 'wss': {
      return _createHttpBasedInterface(resourceData.endpoints, resourceId, transaction)
    }
    default:
      break
  }
}

async function _deleteInterface (resourceData, transaction) {
  switch (resourceData.interfaceProtocol) {
    case 'http':
    case 'https':
    case 'ws':
    case 'wss': {
      return HTTPBasedResourceInterfaceManager.delete({ id: resourceData.interfaceId }, transaction)
    }
    default:
      break
  }
}

async function _updateInterface (resource, newData, transaction) {
  switch (resource.interfaceProtocol) {
    case 'http':
    case 'https':
    case 'ws':
    case 'wss': {
      return _updateHttpBasedInterface(resource.interfaceId, newData.endpoints, transaction)
    }
    default:
      break
  }
}

async function createEdgeResource (edgeResourceData, user, transaction) {
  await Validator.validate(edgeResourceData, Validator.schemas.edgeResourceCreate)
  const { name, description, version, orchestrationTags, interfaceProtocol, display } = edgeResourceData
  const resourceData = {
    userId: user.id,
    name,
    description,
    orchestrationTags,
    interfaceProtocol,
    version
  }
  if (display) {
    resourceData.displayName = display.name
    resourceData.displayIcon = display.icon
    resourceData.displayColor = display.color
  }
  const resource = await EdgeResourceManager.create(resourceData, transaction)
  resource.interfaceId = (await _createInterface(edgeResourceData, resource.id, transaction)).id
  await resource.save(transaction)
  return resource
}

async function updateEdgeResourceEndpoint (edgeResourceData, { name: oldName, version }, user, transaction) {
  await Validator.validate(edgeResourceData, Validator.schemas.edgeResourceUpdate)
  const oldData = await EdgeResourceManager.findOne({ name: oldName, version, userId: user.id })
  if (!oldData) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_RESOURCE_NAME_VERSION, oldName, version))
  }
  if (edgeResourceData.version && oldData.version !== edgeResourceData.version) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.RESOURCE_UPDATE_VERSION_MISMATCH))
  }
  const { name, description, orchestrationTags, interfaceProtocol, display } = edgeResourceData
  const newData = {
    userId: user.id,
    name,
    description,
    orchestrationTags,
    interfaceProtocol
  }
  if (display) {
    newData.displayName = display.name
    newData.displayIcon = display.icon
    newData.displayColor = display.color
  }
  AppHelper.deleteUndefinedFields(newData)
  await EdgeResourceManager.update({ name }, newData, transaction)
  if (oldData.interfaceProtocol !== newData.interfaceProtocol) {
    await _deleteInterface(oldData, transaction)
    await _createInterface(edgeResourceData, oldData.id, transaction)
  } else {
    await _updateInterface(edgeResourceData, transaction)
  }
}

async function deleteEdgeResource ({ name, version }, user, transaction) {
  const resource = await EdgeResourceManager.findOne({ name, version, userId: user.id }, transaction)
  if (!resource) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_RESOURCE_NAME_VERSION, name, version))
  }
  return EdgeResourceManager.delete({ name, userId: user.id }, transaction)
}

async function linkEdgeResource ({ name, version }, agentName, user, transaction) {
  const resource = await EdgeResourceManager.findOne({ name, version, userId: user.id }, transaction)
  if (!resource) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_RESOURCE_NAME_VERSION, name, version))
  }
  const agent = await FogManager.findOne({ name: agentName, userId: user.id }, transaction)
  if (!agent) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, agentName))
  }

  await agent.addEdgeResource(resource.id)
}

async function unlinkEdgeResource ({ name, version }, agentName, user, transaction) {
  const resource = await EdgeResourceManager.findOne({ name, userId: user.id }, transaction)
  if (!resource) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_RESOURCE_NAME_VERSION, name, version))
  }
  const agent = await FogManager.findOne({ name: agentName, userId: user.id }, transaction)
  if (!agent) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, agentName))
  }

  await agent.removeEdgeResource(resource.id)
}

module.exports = {
  getEdgeResource: TransactionDecorator.generateTransaction(getEdgeResource),
  listEdgeResources: TransactionDecorator.generateTransaction(listEdgeResources),
  createEdgeResource: TransactionDecorator.generateTransaction(createEdgeResource),
  deleteEdgeResource: TransactionDecorator.generateTransaction(deleteEdgeResource),
  updateEdgeResourceEndpoint: TransactionDecorator.generateTransaction(updateEdgeResourceEndpoint),
  linkEdgeResource: TransactionDecorator.generateTransaction(linkEdgeResource),
  unlinkEdgeResource: TransactionDecorator.generateTransaction(unlinkEdgeResource),
  getInterface
}
