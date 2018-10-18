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

async function _createConnector(connectorData, transaction) {
  await Validator.validate(connectorData, Validator.schemas.connectorCreate)
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
  await ConnectorManager.delete(queryConnectorData, transaction)
}

async function _getConnectorList(transaction) {
  return await ConnectorManager.findAll({}, transaction)
}

module.exports = {
  createConnectorWithTransaction: TransactionDecorator.generateTransaction(_createConnector),
  updateConnectorWithTransaction: TransactionDecorator.generateTransaction(_updateConnector),
  deleteConnectorWithTransaction: TransactionDecorator.generateTransaction(_deleteConnector),
  getConnectorListWithTransaction: TransactionDecorator.generateTransaction(_getConnectorList)
}