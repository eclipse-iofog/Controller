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
const ChangeTrackingService = require('../services/change-tracking-service')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const MicroserviceManager = require('../data/managers/microservice-manager')
const RoutingManager = require('../data/managers/routing-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')

async function getRouting (user, isCLI, transaction) {
  const routes = await RoutingManager.findAll({}, transaction)
  return { routes }
}

async function _validateRouteMsvc (routingData, transaction) {
  const sourceWhere = { uuid: routingData.sourceMicroserviceUuid }

  const sourceMicroservice = await MicroserviceManager.findOne(sourceWhere, transaction)
  if (!sourceMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_SOURCE_MICROSERVICE_UUID, routingData.sourceMicroserviceUuid))
  }

  const destWhere = { uuid: routingData.destMicroserviceUuid }

  const destMicroservice = await MicroserviceManager.findOne(destWhere, transaction)
  if (!destMicroservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_DEST_MICROSERVICE_UUID, routingData.destMicroserviceUuid))
  }
  return { sourceMicroservice, destMicroservice }
}

async function createRouting (routingData, user, isCLI, transaction) {
  await Validator.validate(routingData, Validator.schemas.routingCreate)

  const { sourceMicroservice, destMicroservice } = await _validateRouteMsvc(routingData, transaction)

  return _createRoute(sourceMicroservice, destMicroservice, user, transaction)
}

async function updateRouting (routingId, routeData, user, isCLI, transaction) {
  await Validator.validate(routeData, Validator.schemas.routingUpdate)

  const oldRoute = RoutingManager.findOne({ id: routingId }, transaction)
  if (!oldRoute) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTING_ID, routingId))
  }

  const updateRouteData = {
    ...oldRoute,
    ...AppHelper.deleteUndefinedFields(routeData)
  }

  const { sourceMicroservice, destMicroservice } = await _validateRouteMsvc(updateRouteData, transaction)

  const updateRebuildMs = {
    rebuild: true
  }

  if (sourceMicroservice.uuid !== oldRoute.sourceMicroserviceUuid) {
    // Update change tracking of oldMsvc
    const msvc = await MicroserviceManager.findOne({ uuid: oldRoute.sourceMicroserviceUuid }, transaction)
    await ChangeTrackingService.update(msvc.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)

    // Update new source msvc
    await MicroserviceManager.update({ uuid: sourceMicroservice.uuid }, updateRebuildMs, transaction)
    await ChangeTrackingService.update(sourceMicroservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  }
  if (destMicroservice.uuid !== oldRoute.destMicroserviceUuid) {
    // Update change tracking of oldMsvc
    const msvc = await MicroserviceManager.findOne({ uuid: oldRoute.destMicroserviceUuid }, transaction)
    await ChangeTrackingService.update(msvc.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)

    // Update new dest msvc
    await MicroserviceManager.update({ uuid: destMicroservice.uuid }, updateRebuildMs, transaction)
    await ChangeTrackingService.update(destMicroservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  }

  await RoutingManager.update({ id: routingId }, updateRouteData, transaction)
}

async function _createRoute (sourceMicroservice, destMicroservice, user, transaction) {
  if (!sourceMicroservice.iofogUuid || !destMicroservice.iofogUuid) {
    throw new Errors.ValidationError('fog not set')
  }
  if (sourceMicroservice.flowId !== destMicroservice.flowId) {
    throw new Errors.ValidationError('microservices on different flows')
  }

  const route = await RoutingManager.findOne({
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid
  }, transaction)
  if (route) {
    throw new Errors.ValidationError('route already exists')
  }

  return _createSimpleRoute(sourceMicroservice, destMicroservice, transaction)
}

async function deleteRouting (id, user, isCLI, transaction) {
  const route = await RoutingManager.findOne({ id }, transaction)
  if (!route) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.ROUTE_NOT_FOUND))
  }

  await _deleteSimpleRoute(route, transaction)
}

async function _createSimpleRoute (sourceMicroservice, destMicroservice, transaction) {
  // create new route
  const routeData = {
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid
  }

  const newRoute = await RoutingManager.create(routeData, transaction)
  await _switchOnUpdateFlagsForMicroservicesInRoute(sourceMicroservice, destMicroservice, transaction)
  return newRoute
}

async function _deleteSimpleRoute (route, transaction) {
  await RoutingManager.delete({ id: route.id }, transaction)

  const sourceMsvc = await MicroserviceManager.findOne({ uuid: route.sourceMicroserviceUuid }, transaction)
  const destMsvc = await MicroserviceManager.findOne({ uuid: route.destMicroserviceUuid }, transaction)

  await ChangeTrackingService.update(sourceMsvc.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  await ChangeTrackingService.update(destMsvc.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
}

async function _switchOnUpdateFlagsForMicroservicesInRoute (sourceMicroservice, destMicroservice, transaction) {
  const updateRebuildMs = {
    rebuild: true
  }
  await MicroserviceManager.update({ uuid: sourceMicroservice.uuid }, updateRebuildMs, transaction)
  await MicroserviceManager.update({ uuid: destMicroservice.uuid }, updateRebuildMs, transaction)

  await ChangeTrackingService.update(sourceMicroservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  await ChangeTrackingService.update(destMicroservice.iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
}

module.exports = {
  getRouting: TransactionDecorator.generateTransaction(getRouting),
  createRouting: TransactionDecorator.generateTransaction(createRouting),
  updateRouting: TransactionDecorator.generateTransaction(updateRouting),
  deleteRouting: TransactionDecorator.generateTransaction(deleteRouting)
}
