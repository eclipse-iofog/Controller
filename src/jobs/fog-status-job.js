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

const FogManager = require('../sequelize/managers/iofog-manager')
const MicroserviceManager = require('../sequelize/managers/microservice-manager')
const MicroserviceStatusManager = require('../sequelize/managers/microservice-status-manager')
const MicroserviceService = require('../services/microservices-service')
const MicroserviceStates = require('../enums/microservice-state')
const FogStates = require('../enums/fog-state')
const BaseJobHandler = require('./base/base-job-handler')
const Config = require('../config')

class FogStatusJob extends BaseJobHandler {
  constructor() {
    super()
    this.scheduleTime = Config.get('Settings:FogStatusUpdateIntervalSeconds') * 1000
  }

  run() {
    setInterval(TransactionDecorator.generateFakeTransaction(updateFogsConnectionStatus), this.scheduleTime)
  }
}

async function updateFogsConnectionStatus(transaction) {
  const unknownFogUuids = await _updateFogStatus(transaction)
  const microservices = await _updateMicroserviceStatus(unknownFogUuids, transaction)
  await _deleteNotRunningMicroservices(microservices, transaction)
}

async function _updateFogStatus(transaction) {
  const minInMs = Config.get('Settings:FogStatusFrequencySeconds') * 1000
  const fogs = await FogManager.findAll({ daemonStatus: FogStates.RUNNING }, transaction)
  const unknownFogUuids = fogs
      .filter((fog) => {
        const intervalInMs = fog.statusFrequency > minInMs ? fog.statusFrequency * 2 : minInMs
        return Date.now() - fog.lastStatusTime > intervalInMs
      })
      .map((fog) => fog.uuid)

  const where = { uuid: unknownFogUuids }
  const data = { daemonStatus: FogStates.UNKNOWN, ipAddress: '0.0.0.0' }
  await FogManager.update(where, data, transaction)
  return unknownFogUuids
}

async function _updateMicroserviceStatus(unknownFogUuids, transaction) {
  const microservices = await MicroserviceManager.findAllWithStatuses({ iofogUuid: unknownFogUuids }, transaction)
  const microserviceStatusIds = microservices.map((microservice) => microservice.microserviceStatus.id)
  await MicroserviceStatusManager.update({ id: microserviceStatusIds }, { status: MicroserviceStates.NOT_RUNNING }, transaction)
  return microservices
}

async function _deleteNotRunningMicroservices(microservices, transaction) {
  for (microservice of microservices) {
    if (microservice.delete) {
      await MicroserviceService.deleteMicroserviceWithRoutesAndPortMappings(microservice, transaction)
    }
  }
}

module.exports = new FogStatusJob()
