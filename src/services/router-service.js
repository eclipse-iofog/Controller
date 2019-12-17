/*
 *  *******************************************************************************
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

const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')
const RouterManager = require('../data/managers/router-manager')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')

// const MicroserviceService = require('../services/microservices-service')

async function createRouter (routerData, transaction) {
  await Validator.validate(routerData, Validator.schemas.routerCreate)
  _validateRouterData(routerData)
  const router = await RouterManager.findOne({
    name: routerData.name
  }, transaction)
  if (router) {
    throw new Errors.ValidationError(ErrorMessages.ALREADY_EXISTS)
  }
  return RouterManager.create(routerData, transaction)
}

async function updateRouter (routerData, transaction) {
  await Validator.validate(routerData, Validator.schemas.routerUpdate)
  _validateRouterData(routerData)
  const queryRouterData = {
    name: routerData.name
  }

  const router = await RouterManager.findOne({
    name: routerData.name
  }, transaction)
  if (!router) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONNECTOR_NOT_FOUND, routerData.name))
  }

  await RouterManager.update(queryRouterData, routerData, transaction)
  const updatedRouter = await RouterManager.findOne({ name: routerData.name }, transaction)
  // TODO: Replace this - reconnect routers? or just leave as is?
  // await MicroserviceService.updateRouteOverRouter(updatedRouter, transaction)
  // await MicroserviceService.updatePortMappingOverRouter(updatedRouter, transaction)
  return updatedRouter
}

async function deleteRouter (routerData, transaction) {
  await Validator.validate(routerData, Validator.schemas.routerDelete)
  const queryRouterData = {
    name: routerData.name
  }
  const router = await RouterManager.findOne(queryRouterData, transaction)
  if (!router) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONNECTOR_NOT_FOUND, routerData.name))
  }
  // TODO: Replace this - could disconnect routers
  // const ports = await RouterPortManager.findAll({ routerId: router.id, moved: false }, transaction)
  // if (ports && ports.length > 0) {
  //   throw new Errors.ValidationError(ErrorMessages.CONNECTOR_IS_IN_USE)
  // }
  await RouterManager.delete(queryRouterData, transaction)
}

async function getRouterList (transaction) {
  return RouterManager.findAll({}, transaction)
}

function _validateRouterData (routerData) {
  const valid = AppHelper.isValidDomain(routerData.host) || AppHelper.isValidPublicIP(routerData.host)
  if (!valid) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_ROUTER_HOST, routerData.domain))
  }
}

module.exports = {
  createRouter: TransactionDecorator.generateTransaction(createRouter),
  updateRouter: TransactionDecorator.generateTransaction(updateRouter),
  deleteRouter: TransactionDecorator.generateTransaction(deleteRouter),
  getRouterList: TransactionDecorator.generateTransaction(getRouterList)
}
