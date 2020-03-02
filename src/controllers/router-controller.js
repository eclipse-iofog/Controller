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
const RouterService = require('../services/router-service')

const upsertDefaultRouter = async function (req) {
  const routerData = req.body
  return RouterService.upsertDefaultRouter(routerData)
}

const getRouterEndPoint = async function () {
  return RouterService.getDefaultRouter()
}

module.exports = {
  upsertDefaultRouter: AuthDecorator.checkAuthToken(upsertDefaultRouter),
  getRouterEndPoint: AuthDecorator.checkAuthToken(getRouterEndPoint)
}
