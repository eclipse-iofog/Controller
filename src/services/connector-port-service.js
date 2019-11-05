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

const qs = require('qs')

const ConnectorManager = require('../data/managers/connector-manager')
const { connectorApiHelper } = require('../helpers/http-request-helper')
const logger = require('../logger')

async function openPortOnRandomConnector (isPublicAccess, transaction) {
  let isConnectorPortOpen = false
  let ports = null
  let connector = null
  const maxAttempts = 5

  const connectors = await ConnectorManager.findAll({ healthy: true }, transaction)
  if (!connectors || connectors.length === 0) {
    throw new Error('No Connectors found to open ports on.')
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      connector = await _getRandomConnector(connectors, transaction)
      ports = await _openPortsOnConnector(connector, isPublicAccess)
      if (ports) {
        isConnectorPortOpen = true
        break
      }
    } catch (e) {
      logger.warn(`Failed to open ports on Connector. Attempts ${i + 1}/${maxAttempts}`)
    }
  }
  if (!isConnectorPortOpen) {
    throw new Error('Not able to open port on remote Connector. Gave up after 5 attempts.')
  }
  ports.connectorId = connector.id
  return { ports: ports, connector: connector }
}

function _openPortsOnConnector (connector, isPublicAccess) {
  const data = isPublicAccess
    ? qs.stringify({
      mapping: '{"type":"public","maxconnections":60,"heartbeatabsencethreshold":200000}'
    })
    : qs.stringify({
      mapping: '{"type":"private","maxconnectionsport1":1, "maxconnectionsport2":1, ' +
      '"heartbeatabsencethresholdport1":200000, "heartbeatabsencethresholdport2":200000}'
    })

  return connectorApiHelper(connector, data, '/api/v2/mapping/add')
}

async function _getRandomConnector (connectors, transaction) {
  const randomNumber = Math.round((Math.random() * (connectors.length - 1)))
  return connectors[randomNumber]
}

function closePortOnConnector (connector, ports) {
  const data = qs.stringify({
    mappingid: ports.mappingId
  })

  return connectorApiHelper(connector, data, '/api/v2/mapping/remove')
}

module.exports = {
  openPortOnRandomConnector: openPortOnRandomConnector,
  closePortOnConnector: closePortOnConnector
}
