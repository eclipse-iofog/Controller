/*
 * *******************************************************************************
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

const RouterService = require('../services/router-service')

const addRouterEndPoint = async function (req) {
  const connectorData = req.body
  return RouterService.createRouter(connectorData)
}

const updateRouterEndPoint = async function (req) {
  const connectorData = req.body
  return RouterService.updateRouter(connectorData)
}

const deleteRouterEndPoint = async function (req) {
  const connectorData = req.body
  return RouterService.deleteRouter(connectorData)
}

const listRouterEndPoint = async function (req) {
  const res = await RouterService.getRouterList()
  return {
    routers: res
  }
}

module.exports = {
  addRouterEndPoint,
  updateRouterEndPoint,
  deleteRouterEndPoint,
  listRouterEndPoint
}
