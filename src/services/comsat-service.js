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
const ComsatManager = require('../sequelize/managers/comsat-manager')

async function _createComsat(comsatData, transaction) {
  await Validator.validate(comsatData, Validator.schemas.comsatCreate)
  await ComsatManager.create(comsatData, transaction)
}

async function _updateComsat(comsatData, transaction) {
  await Validator.validate(comsatData, Validator.schemas.comsatUpdate)
  const queryComsatData = {
    publicIp: comsatData.publicIp
  }
  await ComsatManager.update(queryComsatData, comsatData, transaction)
}

async function _deleteComsat(comsatData, transaction) {
  await Validator.validate(comsatData, Validator.schemas.comsatDelete)
  const queryComsatData = {
    publicIp: comsatData.publicIp
  }
  await ComsatManager.delete(queryComsatData, transaction)
}

async function _getComsatList(transaction) {
  return await ComsatManager.findAll({}, transaction)
}

module.exports = {
  createComsatWithTransaction: TransactionDecorator.generateTransaction(_createComsat),
  updateComsatWithTransaction: TransactionDecorator.generateTransaction(_updateComsat),
  deleteComsatWithTransaction: TransactionDecorator.generateTransaction(_deleteComsat),
  getComsatListWithTransaction: TransactionDecorator.generateTransaction(_getComsatList)
}