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

const ConnectorManager = require('../sequelize/managers/connector-manager')
const https = require('https')
const http = require('http')
const constants = require('../helpers/constants')
const logger = require('../logger')
const qs = require('qs')
const fs = require('fs')

async function openPortOnRandomConnector(isPublicAccess, transaction) {
  let isConnectorPortOpen = false
  let ports = null
  let connector = null
  const maxAttempts = 5
  for (let i = 0; i < maxAttempts; i++) {
    try {
      connector = await _getRandomConnector(transaction)
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
  return {ports: ports, connector: connector}
}

async function _openPortsOnConnector(connector, isPublicAccess) {
  const data = isPublicAccess
    ? await qs.stringify({
      mapping: '{"type":"public","maxconnections":60,"heartbeatabsencethreshold":200000}',
    })
    : await qs.stringify({
      mapping: '{"type":"private","maxconnectionsport1":1, "maxconnectionsport2":1, ' +
      '"heartbeatabsencethresholdport1":200000, "heartbeatabsencethresholdport2":200000}',
    })

  const port = connector.devMode ? constants.CONNECTOR_HTTP_PORT : constants.CONNECTOR_HTTPS_PORT

  const options = {
    host: connector.domain,
    port: port,
    path: '/api/v2/mapping/add',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data),
    },
  }
  if (!connector.devMode && connector.cert && connector.isSelfSignedCert === true) {
    const ca = fs.readFileSync(connector.cert)
    /* eslint-disable new-cap */
    options.ca = new Buffer.from(ca)
  }

  const ports = await _makeRequest(connector, options, data)
  return ports
}

async function _getRandomConnector(transaction) {
  const connectors = await ConnectorManager.findAll({}, transaction)

  if (connectors && connectors.length > 0) {
    const randomNumber = Math.round((Math.random() * (connectors.length - 1)))
    return connectors[randomNumber]
  } else {
    throw new Error('no connectors defined')
  }
}

async function closePortOnConnector(connector, ports) {
  const data = qs.stringify({
    mappingid: ports.mappingId,
  })

  const port = connector.devMode ? constants.CONNECTOR_HTTP_PORT : constants.CONNECTOR_HTTPS_PORT

  const options = {
    host: connector.domain,
    port: port,
    path: '/api/v2/mapping/remove',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data),
    },
  }
  if (!connector.devMode && connector.cert && connector.isSelfSignedCert === true) {
    const ca = fs.readFileSync(connector.cert)
    /* eslint-disable new-cap */
    options.ca = new Buffer.from(ca)
  }


  await _makeRequest(connector, options, data)
}

async function _makeRequest(connector, options, data) {
  return new Promise((resolve, reject) => {
    const httpreq = (connector.devMode ? http : https).request(options, function(response) {
      let output = ''
      response.setEncoding('utf8')

      response.on('data', function(chunk) {
        output += chunk
      })

      response.on('end', function() {
        const responseObj = JSON.parse(output)
        if (responseObj.errormessage) {
          return reject(new Error(responseObj.errormessage))
        } else {
          return resolve(responseObj)
        }
      })
    })

    httpreq.on('error', function(err) {
      if (err instanceof Error) {
        return reject(new Error(err.message))
      } else {
        return reject(new Error(JSON.stringify(err)))
      }
    })

    httpreq.write(data)
    httpreq.end()
  })
}

module.exports = {
  openPortOnRandomConnector: openPortOnRandomConnector,
  closePortOnConnector: closePortOnConnector,
}
