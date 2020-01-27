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
const Constants = require('../helpers/constants')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const MicroserviceEnvManager = require('../data/managers/microservice-env-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const RouterConnectionManager = require('../data/managers/router-connection-manager')
const RouterManager = require('../data/managers/router-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')

async function validateAndReturnUpstreamRouters (upstreamRouterIds, defaultRouter, transaction) {
  if (!upstreamRouterIds) {
    if (!defaultRouter) {
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
  const routerData = {
    isEdge,
    messagingPort: messagingPort,
    host: !isEdge ? fogData.host : null,
    edgeRouterPort: !isEdge ? fogData.edgeRouterPort : null,
    interRouterPort: !isEdge ? fogData.interRouterPort : null,
    isDefault: false,
    iofogUuid: uuid
  }

  const router = await RouterManager.create(routerData, transaction)

  let microserviceConfig = _getRouterMicroserviceConfig(isEdge, uuid, messagingPort, router.interRouterPort, router.edgeRouterPort)

  for (const upstreamRouter of upstreamRouters) {
    await RouterConnectionManager.create({ sourceRouter: router.id, destRouter: upstreamRouter.id }, transaction)
    microserviceConfig += _getRouterConnectorConfig(isEdge, upstreamRouter)
  }

  await _createRouterMicroservice(isEdge, uuid, userId, microserviceConfig, transaction)

  return {
    host: 'localhost',
    port: router.messagingPort
  }
}

async function _createRouterMicroservice (isEdge, uuid, userId, microserviceConfig, transaction) {
  const routerCatalog = await CatalogService.getRouterCatalogItem(transaction)
  const routerMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: `Router for Fog ${uuid}`,
    config: '{}',
    catalogItemId: routerCatalog.id,
    iofogUuid: uuid,
    rootHostAccess: true,
    logSize: 50,
    userId,
    configLastUpdated: Date.now()
  }
  const routerMicroservice = await MicroserviceManager.create(routerMicroserviceData, transaction)

  if (!isEdge) {
    await MicroserviceEnvManager.create({ key: 'QDROUTERD_AUTO_MESH_DISCOVERY', value: 'QUERY', microserviceUuid: routerMicroservice.uuid }, transaction)
  }
  await MicroserviceEnvManager.create({ key: 'QDROUTERD_CONF', value: microserviceConfig, microserviceUuid: routerMicroservice.uuid }, transaction)
}

function _getRouterConnectorConfig (isEdge, dest) {
  return '\nconnector {\n  name: ' + (dest.iofogUuid || Constants.DEFAULT_ROUTER_NAME) +
    '\n  host: ' + dest.host +
    '\n  port: ' + (isEdge ? dest.edgeRouterPort : dest.interRouterPort) +
    '\n  role: ' + (isEdge ? 'edge' : 'inter-router') + '\n}'
}

function _getRouterMicroserviceConfig (isEdge, uuid, messagingPort, interRouterPort, edgeRouterPort) {
  let microserviceConfig = 'router {\n  mode: ' + (isEdge ? 'edge' : 'interior') + '\n  id: ' + uuid + '\n}'
  microserviceConfig += '\nlistener {\n  role: normal\n  host: 0.0.0.0\n  port: ' + messagingPort + '\n}'

  if (!isEdge) {
    microserviceConfig += '\nlistener {\n  role: inter-router\n  host: 0.0.0.0\n  port: ' + interRouterPort + '\n  saslMechanisms: ANONYMOUS\n  authenticatePeer: no\n}'
    microserviceConfig += '\nlistener {\n  role: edge\n  host: 0.0.0.0\n  port: ' + edgeRouterPort + '\n  saslMechanisms: ANONYMOUS\n  authenticatePeer: no\n}'
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

module.exports = {
  createRouterForFog: TransactionDecorator.generateTransaction(createRouterForFog),
  getDefaultRouter: TransactionDecorator.generateTransaction(getDefaultRouter),
  getNetworkRouter: TransactionDecorator.generateTransaction(getNetworkRouter),
  upsertDefaultRouter: TransactionDecorator.generateTransaction(upsertDefaultRouter),
  validateAndReturnUpstreamRouters: TransactionDecorator.generateTransaction(validateAndReturnUpstreamRouters)
}
