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

const architectureManager = require('../data/managers/architecture-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const packageJson = require('../../package')
const AppHelper = require('../helpers/app-helper')

const getArchitectures = async function (isCLI, transaction) {
  const architectures = await architectureManager.findAll({}, transaction)
  const response = []

  for (const architecture of architectures) {
    response.push({
      id: architecture.id,
      name: architecture.name,
      image: architecture.image,
      description: architecture.description
    })
  }

  return {
    architectures: response
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
  getArchitectures: TransactionDecorator.generateTransaction(getArchitectures),
  statusController: statusController,
  getVersion: getVersion
}
