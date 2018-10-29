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
const ConnectorManager = require('../sequelize/managers/connector-manager')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')
const https = require('https');
const http = require('http');
const constants = require('../helpers/constants')
const logger = require('../logger')
const querystring = require('querystring')
const Op = require('sequelize').Op;
const Sequelize = require('sequelize');

async function _createConnector(connectorData, transaction) {
  await Validator.validate(connectorData, Validator.schemas.connectorCreate)
  const connector = await ConnectorManager.findOne({
    [Op.or]: [
      {name: connectorData.name},
      {publicIp: connectorData.publicIp},
      {domain: connectorData.domain}
    ]
  }, transaction)
  if (connector) {
    throw new Errors.ValidationError(ErrorMessages.ALREADY_EXISTS)
  }
  await ConnectorManager.create(connectorData, transaction)
}

async function _updateConnector(connectorData, transaction) {
  await Validator.validate(connectorData, Validator.schemas.connectorUpdate)
  const queryConnectorData = {
    publicIp: connectorData.publicIp
  }
  await ConnectorManager.update(queryConnectorData, connectorData, transaction)
}

async function _deleteConnector(connectorData, transaction) {
  await Validator.validate(connectorData, Validator.schemas.connectorDelete)
  const queryConnectorData = {
    publicIp: connectorData.publicIp
  }
  const affectedRows = await ConnectorManager.delete(queryConnectorData, transaction)
  if (affectedRows === 0) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_CONNECTOR_IP, connectorData.publicIp))
  }
}

async function _getConnectorList(transaction) {
  return await ConnectorManager.findAll({}, transaction)
}

async function openPortOnRandomConnector(isPublicAccess, transaction) {
  let isConnectorPortOpen = false
  let ports = null;
  let connector = null;
  const maxAttempts = 5
  for (let i = 0; i < maxAttempts; i++) {
    try {
      connector = await _getRandomConnector(transaction)
      ports = await openPortsOnConnector(connector, isPublicAccess, transaction)
      if (ports) {
        isConnectorPortOpen = true
        break;
      }
    } catch(e) {
      logger.warn(`Failed to open ports on comsat. Attempts ${i+1}/${maxAttempts}`)
    }
  }
  if (!isConnectorPortOpen) {
    throw new Error('Not able to open port on remote CONNECTOR. Gave up after 5 attempts.')
  }
  ports.connectorId = connector.id
  return {ports: ports, connector: connector}
}

async function _makeRequest(connector, options, data) {
  return new Promise((resolve, reject) => {
    let httpreq = (connector.devMode ? http : https).request(options, function(response) {
      console.log(response.statusCode);
      let output = '';
      response.setEncoding('utf8');

      response.on('data', function(chunk) {
        output += chunk;
      });

      response.on('end', function() {
        let responseObj = JSON.parse(output);
        console.log(responseObj);
        if (responseObj.errormessage) {
          reject(new Error(responseObj.errormessage));
        } else {
          resolve(responseObj);
        }
      });
    })

    if (connector.cert && connector.isSelfSignedCert === true) {
      let ca = '-----BEGIN CERTIFICATE-----\n' + connector.cert + '\n' + '-----END CERTIFICATE-----';
      options.ca = new Buffer(ca);
    }

    httpreq.on('error', function(err) {
      console.log(err);
      if (err instanceof Error)
        reject(new Error(err.message));
      else
        reject(new Error(JSON.stringify(err)));
    });

    httpreq.write(data);
    httpreq.end();
  })
}

//TODO refactor this
async function openPortsOnConnector(connector, isPublicAccess, transaction) {
  let data = isPublicAccess
    ? await querystring.stringify({
      mapping: '{"type":"public","maxconnections":60,"heartbeatabsencethreshold":200000}'
    })
    : await querystring.stringify({
      mapping: '{"type":"private","maxconnectionsport1":1, "maxconnectionsport2":1, ' +
        '"heartbeatabsencethresholdport1":200000, "heartbeatabsencethresholdport2":200000}'
    });

  let port = connector.devMode ? constants.CONNECTOR_HTTP_PORT : constants.CONNECTOR_HTTPS_PORT;

  let options = {
    host: connector.domain,
    port: port,
    path: '/api/v2/mapping/add',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const ports = await _makeRequest(connector, options, data)
  return ports
}

async function _getRandomConnector(transaction) {
  const connectors = await _getConnectorList(transaction)
  if (connectors && connectors.length > 0) {
    const randomNumber = Math.round((Math.random() * (connectors.length - 1)));
    return connectors[randomNumber]
  } else {
    throw new Error('no connectors defined')
  }
}

async function closePortOnConnector(connector, ports, transaction) {
  console.log(ports);

  let data = querystring.stringify({
    mappingid: ports.mappingId
  });
  console.log(data);

  let port = connector.devMode ? constants.CONNECTOR_HTTP_PORT : constants.CONNECTOR_HTTPS_PORT;

  let options = {
    host: connector.domain,
    port: port,
    path: '/api/v2/mapping/remove',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };


  await _makeRequest(connector, options, data)
}

module.exports = {
  createConnectorWithTransaction: TransactionDecorator.generateTransaction(_createConnector),
  updateConnectorWithTransaction: TransactionDecorator.generateTransaction(_updateConnector),
  deleteConnectorWithTransaction: TransactionDecorator.generateTransaction(_deleteConnector),
  getConnectorListWithTransaction: TransactionDecorator.generateTransaction(_getConnectorList),
  openPortOnRandomConnector: openPortOnRandomConnector,
  closePortOnConnector: closePortOnConnector
}