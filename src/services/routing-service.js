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

async function getRoutings (user, isCLI, transaction) {
  const routes = await RoutingManager.findAll({}, transaction)
  return { routes }
}

async function getRouting (name, user, isCLI, transaction) {
  const route = await RoutingManager.findOne({ name }, transaction)
  if (!route) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTING_NAME, name))
  }
  return route
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

  return _createRoute(sourceMicroservice, destMicroservice, routingData, user, transaction)
}

async function updateRouting (routeName, routeData, user, isCLI, transaction) {
  await Validator.validate(routeData, Validator.schemas.routingUpdate)

  const oldRoute = await RoutingManager.findOne({ name: routeName }, transaction)
  if (!oldRoute) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTING_NAME, routeName))
  }

  const updateRouteData = {
    ...oldRoute.get({ plain: true }),
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

  await RoutingManager.update({ name: routeName }, updateRouteData, transaction)
}

async function _createRoute (sourceMicroservice, destMicroservice, routeData, user, transaction) {
  if (!sourceMicroservice.iofogUuid || !destMicroservice.iofogUuid) {
    throw new Errors.ValidationError('fog not set')
  }
  if (sourceMicroservice.applicationId !== destMicroservice.applicationId) {
    throw new Errors.ValidationError('microservices on different applications')
  }

  const route = await RoutingManager.findOne({
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid
  }, transaction)
  if (route) {
    throw new Errors.DuplicatePropertyError('route already exists')
  }

  return _createSimpleRoute(sourceMicroservice, destMicroservice, routeData, transaction)
}

async function deleteRouting (name, user, isCLI, transaction) {
  const route = await RoutingManager.findOne({ name }, transaction)
  if (!route) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.ROUTE_NOT_FOUND))
  }

  await _deleteSimpleRoute(route, transaction)
}

async function _createSimpleRoute (sourceMicroservice, destMicroservice, routeData, transaction) {
  // create new route
  const createRouteData = {
    ...routeData,
    sourceMicroserviceUuid: sourceMicroservice.uuid,
    destMicroserviceUuid: destMicroservice.uuid
  }

  const newRoute = await RoutingManager.create(createRouteData, transaction)
  await _switchOnUpdateFlagsForMicroservicesInRoute(sourceMicroservice, destMicroservice, transaction)
  return newRoute
}

async function _deleteSimpleRoute (route, transaction) {
  await RoutingManager.delete({ name: route.name }, transaction)

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
  getRoutings: TransactionDecorator.generateTransaction(getRoutings),
  createRouting: TransactionDecorator.generateTransaction(createRouting),
  updateRouting: TransactionDecorator.generateTransaction(updateRouting),
  deleteRouting: TransactionDecorator.generateTransaction(deleteRouting)
}
