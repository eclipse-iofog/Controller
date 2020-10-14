/*
 * *******************************************************************************
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

const AuthDecorator = require('./../decorators/authorization-decorator')
const RoutingService = require('../services/routing-service')

const createRoutingEndpoint = async function (req, user) {
  const routerData = req.body
  return RoutingService.createRouting(routerData, user, false)
}

const getRoutingsEndPoint = async function (req, user) {
  return RoutingService.getRoutings(user, false)
}

const getRoutingEndPoint = async function (req, user) {
  const routeName = req.params.name
  return RoutingService.getRouting(routeName, user, false)
}

const updateRoutingEndpoint = async function (req, user) {
  const routeName = req.params.name
  const routeData = req.body
  return RoutingService.updateRouting(routeName, routeData, user, false)
}

const deleteRoutingEndpoint = async function (req, user) {
  const routeName = req.params.name
  return RoutingService.deleteRouting(routeName, user, false)
}

module.exports = {
  deleteRoutingEndpoint: AuthDecorator.checkAuthToken(deleteRoutingEndpoint),
  updateRoutingEndpoint: AuthDecorator.checkAuthToken(updateRoutingEndpoint),
  createRoutingEndpoint: AuthDecorator.checkAuthToken(createRoutingEndpoint),
  getRoutingEndPoint: AuthDecorator.checkAuthToken(getRoutingEndPoint),
  getRoutingsEndPoint: AuthDecorator.checkAuthToken(getRoutingsEndPoint)
}
