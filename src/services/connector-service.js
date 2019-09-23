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
const ConnectorManager = require('../data/managers/connector-manager')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')

const ConnectorPortManager = require('../data/managers/connector-port-manager')
const MicroserviceService = require('../services/microservices-service')

async function createConnector (connectorData, transaction) {
  await Validator.validate(connectorData, Validator.schemas.connectorCreate)
  _validateConnectorData(connectorData)
  const connector = await ConnectorManager.findOne({
    name: connectorData.name
  }, transaction)
  if (connector) {
    throw new Errors.ValidationError(ErrorMessages.ALREADY_EXISTS)
  }
  return ConnectorManager.create(connectorData, transaction)
}

async function updateConnector (connectorData, transaction) {
  await Validator.validate(connectorData, Validator.schemas.connectorUpdate)
  _validateConnectorData(connectorData)
  const queryConnectorData = {
    name: connectorData.name
  }

  const connector = await ConnectorManager.findOne({
    name: connectorData.name
  }, transaction)
  if (!connector) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONNECTOR_NOT_FOUND, connectorData.name))
  }

  await ConnectorManager.update(queryConnectorData, connectorData, transaction)
  const updatedConnector = await ConnectorManager.findOne({ name: connectorData.name }, transaction)
  await MicroserviceService.updateRouteOverConnector(updatedConnector, transaction)
  await MicroserviceService.updatePortMappingOverConnector(updatedConnector, transaction)
  return updatedConnector
}

async function deleteConnector (connectorData, transaction) {
  await Validator.validate(connectorData, Validator.schemas.connectorDelete)
  const queryConnectorData = {
    name: connectorData.name
  }
  const connector = await ConnectorManager.findOne(queryConnectorData, transaction)
  if (!connector) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONNECTOR_NOT_FOUND, connectorData.name))
  }
  const ports = await ConnectorPortManager.findAll({ connectorId: connector.id, moved: false }, transaction)
  if (ports && ports.length > 0) {
    throw new Errors.ValidationError(ErrorMessages.CONNECTOR_IS_IN_USE)
  }
  await ConnectorManager.delete(queryConnectorData, transaction)
}

async function getConnectorList (transaction) {
  return ConnectorManager.findAll({}, transaction)
}

function _validateConnectorData (connectorData) {
  if (connectorData.domain) {
    const validDomain = AppHelper.isValidDomain(connectorData.domain) || AppHelper.isValidPublicIP(connectorData.domain)
    if (!validDomain) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_CONNECTOR_DOMAIN, connectorData.domain))
    }
  }

  if (!AppHelper.isValidPublicIP(connectorData.publicIp)) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_CONNECTOR_IP, connectorData.publicIp))
  }
}

module.exports = {
  createConnector: TransactionDecorator.generateTransaction(createConnector),
  updateConnector: TransactionDecorator.generateTransaction(updateConnector),
  deleteConnector: TransactionDecorator.generateTransaction(deleteConnector),
  getConnectorList: TransactionDecorator.generateTransaction(getConnectorList)
}
