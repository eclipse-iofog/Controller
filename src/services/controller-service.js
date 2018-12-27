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

const ioFogTypesManager = require('../sequelize/managers/iofog-type-manager');
const Config = require('../config');
const TransactionDecorator = require('../decorators/transaction-decorator');
const packageJson = require('../../package');

const getFogTypes = async function (isCLI, transaction) {
  const ioFogTypes = await ioFogTypesManager.findAll({}, transaction);
  let response = [];

  for (ioFogType of ioFogTypes) {
    response.push({
      id: ioFogType.id,
      name: ioFogType.name,
      image: ioFogType.image,
      description: ioFogType.description
    })
  }

  return {
    fogTypes: response
  }

};

const emailActivation = async function (isCLI) {
  const emailActivation = await Config.get('Email:ActivationEnabled');
  return {
    isEmailActivationEnabled: emailActivation
  }
};

const statusController = async function (isCLI) {
  const daemon = require('../daemon');

  let pid = daemon.status();
  if (pid === 0) {
    status = 'offline'
  } else {
    status = 'online'
  }

  return {
    "status": status,
    "timestamp": Date.now(),
  }
};

const getVersion = async function (isCLI) {
  return `ioFog-Controller version: ${packageJson.version}`;
};

module.exports = {
  getFogTypes: TransactionDecorator.generateTransaction(getFogTypes),
  emailActivation: emailActivation,
  statusController: statusController,
  getVersion: getVersion
};