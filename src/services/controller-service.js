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

const FogTypesManager = require('../sequelize/managers/iofog-type-manager');
const Config = require('../config');
const TransactionDecorator = require('../decorators/transaction-decorator');

const getFogTypes = async function (isCLI, transaction) {
  const fogTypes = await FogTypesManager.findAll({}, transaction);
  let res = [];

  for (fogType of fogTypes) {
    res.push({
      id: fogType.id,
      name: fogType.name,
      image: fogType.image,
      description: fogType.description
    })
  }

  return {
    fogTypes: res
  }

};

const emailActivation = async function (isCLI) {
  const emailActivation = await Config.get('Email:ActivationEnabled');
  return {
    isEmailActivationEnabled: emailActivation
  }
};

const statusController = async function (isCLI) {
  return {
    "status": "ok",
    "timestamp": Date.now(),
  }
};

const getVersion = async function (isCLI) {
  return "Iofog-Controller version: 1.0";
};

module.exports = {
  getFogTypes: TransactionDecorator.generateTransaction(getFogTypes),
  emailActivation: emailActivation,
  statusController: statusController,
  getVersion: getVersion
};