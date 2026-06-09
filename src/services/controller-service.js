/*
 * *******************************************************************************
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

const ioFogTypesManager = require('../data/managers/iofog-type-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const packageJson = require('../../package')
const AppHelper = require('../helpers/app-helper')

const getFogTypes = async function (isCLI, transaction) {
  const ioFogTypes = await ioFogTypesManager.findAll({}, transaction)
  const response = []

  for (const ioFogType of ioFogTypes) {
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
}

const statusController = async function (isCLI) {
  let status

  if (AppHelper.isOnline()) {
    status = 'online'
  } else {
    status = 'offline'
  }

  return {
    'status': status,
    'timestamp': Date.now(),
    'uptimeSec': process.uptime(),
    versions: {
      controller: packageJson.version,
      ecnViewer: packageJson.dependencies['@datasance/ecn-viewer']
    }
  }
}

const getVersion = async function (isCLI) {
  return `ioFog-Controller version: ${packageJson.version}`
}

module.exports = {
  getFogTypes: TransactionDecorator.generateTransaction(getFogTypes),
  statusController: statusController,
  getVersion: getVersion
}
