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
const AppHelper = require('../helpers/app-helper')
const FogManager = require('../sequelize/managers/iofog-manager')

async function _createFog(newFog, user, transaction) {
  AppHelper.validateFields(newFog, ['name', 'fogType'])

  newFog.userId = user.id
  if (!newFog.uuid) {
    newFog.uuid = AppHelper.generateRandomString(32)
  }

  const fog = await FogManager.create(newFog, transaction)

  const res = {
    uuid: fog.uuid
  }

  return res
}

const createFogWithTransaction = TransactionDecorator.generateTransaction(_createFog)

module.exports = {
  createFogWithTransaction: TransactionDecorator.generateTransaction(_createFog)
}