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
const TagsManager = require('../data/managers/tags-manager')
const HTTPBasedResourceInterfaceManager = require('../data/managers/http-based-resource-interface-manager')
const HTTPBasedResourceInterfaceEndpointsManager = require('../data/managers/http-based-resource-interface-endpoints-manager')
const FogManager = require('../data/managers/iofog-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')
const ChangeTrackingService = require('./change-tracking-service')

async function listEdgeResources (user, transaction) {
  const edgeResources = await EdgeResourceManager.findAllWithOrchestrationTags({ userId: user.id }, transaction)
  return edgeResources.map(buildGetObject)
}

async function getEdgeResource ({ name, version }, user, transaction) {
  if (version) {
    const resource = await EdgeResourceManager.findOneWithOrchestrationTags({ name, version, userId: user.id }, transaction)
    if (!resource) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_RESOURCE_NAME_VERSION, name, version))
    }
    const intrface = await getInterface(resource, transaction)
    // Transform Sequelize objects into plain JSON objects
    const result = { ...resource.toJSON(), interface: intrface.toJSON() }
    return buildGetObject(result)
  } else {
    const resources = await EdgeResourceManager.findAllWithOrchestrationTags({ name, userId: user.id }, transaction)
    if (!resources.length) {
      return []
    }
    let result = []
    for (const resource of resources) {
      const intrface = await getInterface(resource)
      // Transform Sequelize objects into plain JSON objects
      result.push(buildGetObject({ ...resource.toJSON(), interface: intrface.toJSON() }))
    }
    return result
  }
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

async function _createHttpBasedInterface ({ endpoints }, edgeResourceId, transaction) {
  const httpBasedInterface = await HTTPBasedResourceInterfaceManager.create({ edgeResourceId }, transaction)
  await _createHttpBasedInterfaceEndpoints(endpoints, httpBasedInterface.id, transaction)
  return httpBasedInterface
}

async function _updateHttpBasedInterface (id, { endpoints }, transaction) {
  const httpBasedInterface = await HTTPBasedResourceInterfaceManager.findOne({ id }, transaction)
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
      return _createHttpBasedInterface(resourceData.interface, resourceId, transaction)
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
  if (resource.interfaceProtocol && newData.interface) {
    switch (resource.interfaceProtocol) {
      case 'http':
      case 'https':
      case 'ws':
      case 'wss': {
        return _updateHttpBasedInterface(resource.interfaceId, newData.interface, transaction)
      }
      default:
        break
    }
  }
}

async function _createOrchestrationTags (tagArray, edgeResourceModel, transaction) {
  if (tagArray) {
    let tags = []
    for (const tag of tagArray) {
      let tagModel = await TagsManager.findOne({ value: tag }, transaction)
      if (!tagModel) {
        tagModel = await TagsManager.create({ value: tag }, transaction)
      }
      tags.push(tagModel)
    }
    await edgeResourceModel.setOrchestrationTags(tags)
    return tags
  }
  return []
}

async function _updateOrchestrationTags (tagArray, edgeResourceModel, transaction) {
  const oldTags = await edgeResourceModel.getOrchestrationTags()
  const linkedAgents = await edgeResourceModel.getAgents()
  await edgeResourceModel.setOrchestrationTags([])
  const newTags = await _createOrchestrationTags(tagArray, edgeResourceModel, transaction)
  for (const agent of linkedAgents) {
    await agent.removeTags(oldTags)
    await agent.addTags(newTags)
    await ChangeTrackingService.update(agent.uuid, ChangeTrackingService.events.edgeResources, transaction)
  }
}

async function createEdgeResource (edgeResourceData, user, transaction) {
  await Validator.validate(edgeResourceData, Validator.schemas.edgeResourceCreate)
  const { name, description, version, orchestrationTags, interfaceProtocol, display } = edgeResourceData
  const existingResource = await EdgeResourceManager.findOne({ name, version, userId: user.id }, transaction)
  if (existingResource) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_RESOURCE_NAME_VERSION, name, version))
  }
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
  try {
    if (orchestrationTags) {
      await _createOrchestrationTags(orchestrationTags, resource, transaction)
    }
    resource.interfaceId = (await _createInterface(edgeResourceData, resource.id, transaction)).id
    await resource.save(transaction)
  } catch (e) {
    // Clean up
    await EdgeResourceManager.delete({ id: resource.id }, transaction)
    throw e
  }
  return buildGetObject(resource)
}

async function updateEdgeResourceEndpoint (edgeResourceData, { name: oldName, version }, user, transaction) {
  await Validator.validate(edgeResourceData, Validator.schemas.edgeResourceUpdate)
  const oldData = await EdgeResourceManager.findOne({ name: oldName, version, userId: user.id }, transaction)
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
  if (newData.name && newData.name !== oldData.name) {
    const newVersion = newData.version ? newData.version : version
    const existingResource = await EdgeResourceManager.findOne({ name, version: newVersion, userId: user.id }, transaction)
    if (!existingResource) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_RESOURCE_NAME_VERSION, name, newVersion))
    }
  }

  await EdgeResourceManager.update({ name, version }, newData, transaction)

  if (orchestrationTags) {
    await _updateOrchestrationTags(orchestrationTags, oldData, transaction)
  }
  if (oldData.interfaceProtocol !== newData.interfaceProtocol) {
    await _deleteInterface(oldData, transaction)
    await _createInterface(edgeResourceData, oldData.id, transaction)
  } else {
    await _updateInterface(oldData, edgeResourceData, transaction)
  }
}

async function deleteEdgeResource ({ name, version }, user, transaction) {
  const resource = await EdgeResourceManager.findOne({ name, version, userId: user.id }, transaction)
  if (!resource) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_RESOURCE_NAME_VERSION, name, version))
  }
  const agents = await resource.getAgents()
  const tags = await resource.getOrchestrationTags()
  for (const agent of agents) {
    await agent.removeTags(tags)
    await ChangeTrackingService.update(agent.uuid, ChangeTrackingService.events.edgeResources, transaction)
  }
  await EdgeResourceManager.delete({ name, version, userId: user.id }, transaction)
}

async function linkEdgeResource ({ name, version }, uuid, user, transaction) {
  const resource = await EdgeResourceManager.findOne({ name, version, userId: user.id }, transaction)
  if (!resource) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_RESOURCE_NAME_VERSION, name, version))
  }
  const agent = await FogManager.findOne({ uuid, userId: user.id }, transaction)
  if (!agent) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, uuid))
  }

  await agent.addEdgeResource(resource.id, transaction)
  const tags = await resource.getOrchestrationTags()
  await agent.addTags(tags)
  await ChangeTrackingService.update(agent.uuid, ChangeTrackingService.events.edgeResources, transaction)
}

async function unlinkEdgeResource ({ name, version }, uuid, user, transaction) {
  const resource = await EdgeResourceManager.findOne({ name, userId: user.id }, transaction)
  if (!resource) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_RESOURCE_NAME_VERSION, name, version))
  }
  const agent = await FogManager.findOne({ uuid, userId: user.id }, transaction)
  if (!agent) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.NOT_FOUND_AGENT_NAME, uuid))
  }

  await agent.removeEdgeResource(resource.id, transaction)
  const tags = await resource.getOrchestrationTags()
  await agent.removeTags(tags)
  await ChangeTrackingService.update(agent.uuid, ChangeTrackingService.events.edgeResources, transaction)
}

function buildGetObject (resource) {
  const { name, id, interfaceProtocol, description, version, displayName, displayIcon, displayColor, orchestrationTags } = resource
  return {
    id,
    name,
    description,
    version,
    interfaceProtocol,
    display: {
      name: displayName,
      icon: displayIcon,
      color: displayColor
    },
    orchestrationTags: (orchestrationTags || []).map(t => t.value),
    interface: resource.interface
  }
}

module.exports = {
  getEdgeResource: TransactionDecorator.generateTransaction(getEdgeResource),
  listEdgeResources: TransactionDecorator.generateTransaction(listEdgeResources),
  createEdgeResource: TransactionDecorator.generateTransaction(createEdgeResource),
  deleteEdgeResource: TransactionDecorator.generateTransaction(deleteEdgeResource),
  updateEdgeResourceEndpoint: TransactionDecorator.generateTransaction(updateEdgeResourceEndpoint),
  linkEdgeResource: TransactionDecorator.generateTransaction(linkEdgeResource),
  unlinkEdgeResource: TransactionDecorator.generateTransaction(unlinkEdgeResource),
  getInterface,
  buildGetObject
}
