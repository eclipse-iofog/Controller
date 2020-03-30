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
const CatalogService = require('../services/catalog-service')
const ChangeTrackingService = require('../services/change-tracking-service')
const Constants = require('../helpers/constants')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroservicePortManager = require('../data/managers/microservice-port-manager')
const RouterConnectionManager = require('../data/managers/router-connection-manager')
const RouterManager = require('../data/managers/router-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')
const ldifferenceWith = require('lodash/differenceWith')

async function validateAndReturnUpstreamRouters (upstreamRouterIds, isSystemFog, defaultRouter, transaction) {
  if (!upstreamRouterIds) {
    if (!defaultRouter) {
      // System fog will be created without default router already existing
      if (isSystemFog) { return [] }
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, Constants.DEFAULT_ROUTER_NAME))
    }
    return [defaultRouter]
  }

  const upstreamRouters = []
  for (const upstreamRouterId of upstreamRouterIds) {
    const upstreamRouter = upstreamRouterId === Constants.DEFAULT_ROUTER_NAME ? defaultRouter : await RouterManager.findOne({ iofogUuid: upstreamRouterId }, transaction)
    if (!upstreamRouter) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, upstreamRouterId))
    }
    if (upstreamRouter.isEdge) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_UPSTREAM_ROUTER, upstreamRouterId))
    }

    upstreamRouters.push(upstreamRouter)
  }
  return upstreamRouters
}

async function createRouterForFog (fogData, uuid, userId, upstreamRouters, transaction) {
  const isEdge = fogData.routerMode === 'edge'
  const messagingPort = fogData.messagingPort || 5672
  // Is default router if we are on a system fog and no other default router already exists
  const isDefault = (fogData.isSystem) ? !(await RouterManager.findOne({ isDefault: true }, transaction)) : false
  const routerData = {
    isEdge,
    messagingPort: messagingPort,
    host: fogData.host,
    edgeRouterPort: !isEdge ? fogData.edgeRouterPort : null,
    interRouterPort: !isEdge ? fogData.interRouterPort : null,
    isDefault: isDefault,
    iofogUuid: uuid
  }

  const router = await RouterManager.create(routerData, transaction)

  const microserviceConfig = _getRouterMicroserviceConfig(isEdge, uuid, messagingPort, router.interRouterPort, router.edgeRouterPort)

  for (const upstreamRouter of upstreamRouters) {
    await RouterConnectionManager.create({ sourceRouter: router.id, destRouter: upstreamRouter.id }, transaction)
    microserviceConfig.connectors = (microserviceConfig.connectors || []).concat(_getRouterConnectorConfig(isEdge, upstreamRouter))
  }

  const routerMicroservice = await _createRouterMicroservice(isEdge, uuid, userId, microserviceConfig, transaction)
  await _createRouterPorts(routerMicroservice.uuid, messagingPort, userId, transaction)
  if (!isEdge) {
    await _createRouterPorts(routerMicroservice.uuid, fogData.edgeRouterPort, userId, transaction)
    await _createRouterPorts(routerMicroservice.uuid, fogData.interRouterPort, userId, transaction)
  }

  return router
}

async function updateRouter (oldRouter, newRouterData, upstreamRouters, userId, transaction) {
  const routerCatalog = await CatalogService.getRouterCatalogItem(transaction)
  const routerMicroservice = await MicroserviceManager.findOne({
    catalogItemId: routerCatalog.id,
    iofogUuid: oldRouter.iofogUuid
  }, transaction)

  if (newRouterData.isEdge && !oldRouter.isEdge) {
    // Moving from internal to edge mode
    // If there are downstream routers, return error
    const downstreamRouterConnections = await RouterConnectionManager.findAll({ destRouter: oldRouter.id }, transaction)
    if (downstreamRouterConnections && downstreamRouterConnections.length) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.EDGE_ROUTER_HAS_DOWNSTREAM, oldRouter.id))
    }
    // Removing any possible connecting port
    newRouterData.edgeRouterPort = null
    newRouterData.interRouterPort = null
    await _deleteRouterPorts(routerMicroservice.uuid, oldRouter.edgeRouterPort, transaction)
    await _deleteRouterPorts(routerMicroservice.uuid, oldRouter.interRouterPort, transaction)
  } else if (!newRouterData.isEdge && oldRouter.isEdge) {
    // Moving from edge to internal
    // Nothing specific to update
    await _createRouterPorts(routerMicroservice.uuid, newRouterData.edgeRouterPort, userId, transaction)
    await _createRouterPorts(routerMicroservice.uuid, newRouterData.interRouterPort, userId, transaction)
  }
  newRouterData.messagingPort = newRouterData.messagingPort || 5672
  await RouterManager.update({ id: oldRouter.id }, newRouterData, transaction)

  // Update upstream routers
  const upstreamConnections = await RouterConnectionManager.findAllWithRouters({ sourceRouter: oldRouter.id }, transaction)
  const upstreamToDelete = ldifferenceWith(upstreamConnections, upstreamRouters, (connection, router) => connection.destRouter === router.id)
  for (const connectionToDelete of upstreamToDelete) {
    await RouterConnectionManager.delete({ id: connectionToDelete.id }, transaction)
  }
  const upstreamToCreate = ldifferenceWith(upstreamRouters, upstreamConnections, (router, connection) => connection.destRouter === router.id)
  await RouterConnectionManager.bulkCreate(upstreamToCreate.map(router => ({ sourceRouter: oldRouter.id, destRouter: router.id })), transaction)

  // Update config if needed
  await updateConfig(oldRouter.id, userId, transaction)
  await ChangeTrackingService.update(oldRouter.iofogUuid, ChangeTrackingService.events.routerChanged, transaction)
  await ChangeTrackingService.update(oldRouter.iofogUuid, ChangeTrackingService.events.microserviceList, transaction)

  return {
    host: 'localhost',
    messagingPort: newRouterData.messagingPort
  }
}

async function _deleteRouterPorts (routerMicroserviceUuid, port, transaction) {
  if (!routerMicroserviceUuid) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER))
  }
  await MicroservicePortManager.delete({ microserviceUuid: routerMicroserviceUuid, portInternal: port }, transaction)
}

async function updateConfig (routerID, userId, transaction) {
  const router = await RouterManager.findOne({ id: routerID }, transaction)
  if (!router) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, routerID))
  }
  const microserviceConfig = _getRouterMicroserviceConfig(router.isEdge, router.iofogUuid, router.messagingPort, router.interRouterPort, router.edgeRouterPort)

  const upstreamRoutersConnections = await RouterConnectionManager.findAllWithRouters({ sourceRouter: router.id }, transaction)

  for (const upstreamRouterConnection of upstreamRoutersConnections) {
    microserviceConfig.connectors = (microserviceConfig.connectors || []).concat(_getRouterConnectorConfig(router.isEdge, upstreamRouterConnection.dest))
  }
  const routerCatalog = await CatalogService.getRouterCatalogItem(transaction)
  const routerMicroservice = await MicroserviceManager.findOne({
    catalogItemId: routerCatalog.id,
    iofogUuid: router.iofogUuid
  }, transaction)
  if (!routerMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, router.id))
  }

  if (routerMicroservice.config !== JSON.stringify(microserviceConfig)) {
    await MicroserviceManager.update({ uuid: routerMicroservice.uuid }, { config: JSON.stringify(microserviceConfig) }, transaction)

    if (_listenersChanged(JSON.parse(routerMicroservice.config || '{}').listeners, microserviceConfig.listeners)) {
      MicroservicePortManager.delete({ microserviceUuid: routerMicroservice.uuid }, transaction)
      await _createRouterPorts(routerMicroservice.uuid, router.messagingPort, userId, transaction)
      if (!router.isEdge) {
        await _createRouterPorts(routerMicroservice.uuid, router.edgeRouterPort, userId, transaction)
        await _createRouterPorts(routerMicroservice.uuid, router.interRouterPort, userId, transaction)
      }
      await MicroserviceManager.update({ uuid: routerMicroservice.uuid }, { rebuild: true }, transaction)
      await ChangeTrackingService.update(router.iofogUuid, ChangeTrackingService.events.microserviceList, transaction)
    } else {
      await ChangeTrackingService.update(router.iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
    }
  }
}

function _listenersChanged (currentListeners, newListeners) {
  if (currentListeners.length !== newListeners.length) {
    return true
  }

  for (const listener of currentListeners) {
    if (newListeners.findIndex(l => l.port === listener.port) === -1) {
      return true
    }
  }

  return false
}

function _createRouterPorts (routerMicroserviceUuid, port, userId, transaction) {
  const mappingData = {
    isPublic: false,
    portInternal: port,
    portExternal: port,
    userId: userId,
    microserviceUuid: routerMicroserviceUuid
  }

  return MicroservicePortManager.create(mappingData, transaction)
}

async function _createRouterMicroservice (isEdge, uuid, userId, microserviceConfig, transaction) {
  const routerCatalog = await CatalogService.getRouterCatalogItem(transaction)
  const routerMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: `Router for Fog ${uuid}`,
    config: JSON.stringify(microserviceConfig),
    catalogItemId: routerCatalog.id,
    iofogUuid: uuid,
    rootHostAccess: false,
    logSize: 50,
    userId,
    configLastUpdated: Date.now()
  }
  return MicroserviceManager.create(routerMicroserviceData, transaction)
}

function _getRouterConnectorConfig (isEdge, dest) {
  return {
    name: dest.iofogUuid || Constants.DEFAULT_ROUTER_NAME,
    role: (isEdge ? 'edge' : 'inter-router'),
    host: dest.host,
    port: (isEdge ? dest.edgeRouterPort : dest.interRouterPort)
  }
}

function _getRouterMicroserviceConfig (isEdge, uuid, messagingPort, interRouterPort, edgeRouterPort) {
  const microserviceConfig = {
    mode: isEdge ? 'edge' : 'interior',
    id: uuid,
    listeners: [
      {
        role: 'normal',
        host: '0.0.0.0',
        port: messagingPort
      }
    ]
  }

  if (!isEdge) {
    microserviceConfig.listeners.push(
      {
        role: 'inter-router',
        host: '0.0.0.0',
        port: interRouterPort
      },
      {
        role: 'edge',
        host: '0.0.0.0',
        port: edgeRouterPort
      }
    )
  }

  return microserviceConfig
}

async function getNetworkRouter (networkRouterId, transaction) {
  const query = {}
  if (!networkRouterId) {
    query.isDefault = true
  } else {
    query.iofogUuid = networkRouterId
  }
  return RouterManager.findOne(query, transaction)
}

async function getDefaultRouter (transaction) {
  const defaultRouter = await getNetworkRouter(null, transaction)
  if (!defaultRouter) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER, Constants.DEFAULT_ROUTER_NAME))
  }

  return {
    host: defaultRouter.host,
    messagingPort: defaultRouter.messagingPort,
    edgeRouterPort: defaultRouter.edgeRouterPort,
    interRouterPort: defaultRouter.interRouterPort
  }
}

async function upsertDefaultRouter (routerData, transaction) {
  await Validator.validate(routerData, Validator.schemas.defaultRouterCreate)

  const createRouterData = {
    isEdge: false,
    messagingPort: routerData.messagingPort || 5672,
    host: routerData.host,
    edgeRouterPort: routerData.edgeRouterPort || 56722,
    interRouterPort: routerData.interRouterPort || 56721,
    isDefault: true
  }

  return RouterManager.updateOrCreate({ isDefault: true }, createRouterData, transaction)
}

async function findOne (option, transaction) {
  return RouterManager.findOne(option, transaction)
}

module.exports = {
  createRouterForFog: TransactionDecorator.generateTransaction(createRouterForFog),
  updateConfig: TransactionDecorator.generateTransaction(updateConfig),
  updateRouter: TransactionDecorator.generateTransaction(updateRouter),
  getDefaultRouter: TransactionDecorator.generateTransaction(getDefaultRouter),
  getNetworkRouter: TransactionDecorator.generateTransaction(getNetworkRouter),
  upsertDefaultRouter: TransactionDecorator.generateTransaction(upsertDefaultRouter),
  validateAndReturnUpstreamRouters: TransactionDecorator.generateTransaction(validateAndReturnUpstreamRouters),
  findOne: TransactionDecorator.generateTransaction(findOne)
}
