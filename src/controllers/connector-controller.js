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

const ConnectorService = require('../services/connector-service')

const addConnectorEndPoint = async function (req) {
  const connectorData = req.body
  return ConnectorService.createConnector(connectorData)
}

const updateConnectorEndPoint = async function (req) {
  const connectorData = req.body
  return ConnectorService.updateConnector(connectorData)
}

const deleteConnectorEndPoint = async function (req) {
  const connectorData = req.body
  return ConnectorService.deleteConnector(connectorData)
}

const listConnectorEndPoint = async function (req) {
  const res = await ConnectorService.getConnectorList()
  return {
    connectors: res,
  }
}

module.exports = {
  addConnectorEndPoint,
  updateConnectorEndPoint,
  deleteConnectorEndPoint,
  listConnectorEndPoint,
}
