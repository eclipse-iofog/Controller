/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const ConfigManager = require('../data/managers/config-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')

async function listConfig (transaction) {
  const config = await ConfigManager.findAll({}, transaction)
  return {
    config: config.map(e => _getConfigElementObj(e))
  }
}

async function upsertConfigElement (configElementData, transaction) {
  await Validator.validate(configElementData, Validator.schemas.configElement)

  return ConfigManager.updateOrCreate({ key: configElementData.key }, configElementData, transaction)
}

function _getConfigElementObj (configElement) {
  return {
    key: configElement.key,
    value: configElement.value
  }
}

async function getConfigElement (key, transaction) {
  const configElement = await ConfigManager.findOne({ key }, transaction)
  if (!configElement) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_CONFIG_KEY, key))
  }
  return _getConfigElementObj(configElement)
}

module.exports = {
  listConfig: TransactionDecorator.generateTransaction(listConfig),
  upsertConfigElement: TransactionDecorator.generateTransaction(upsertConfigElement),
  getConfigElement: TransactionDecorator.generateTransaction(getConfigElement)
}
