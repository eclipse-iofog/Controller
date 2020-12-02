/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
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

const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceStates = require('../enums/microservice-state')
const BaseJobHandler = require('./base/base-job-handler')
const Config = require('../config')
const ApplicationManager = require('../data/managers/application-manager')

class FogStatusJob extends BaseJobHandler {
  constructor () {
    super()
    this.scheduleTime = Config.get('Settings:FogStatusUpdateIntervalSeconds') * 1000

    setTimeout(this.run, this.scheduleTime)
  }

  async run () {
    try {
      const _updateStoppedApplicationMicroserviceStatus = TransactionDecorator.generateTransaction(updateStoppedApplicationMicroserviceStatus)
      await _updateStoppedApplicationMicroserviceStatus()
    } catch (error) {
      console.error(error)
    } finally {
      setTimeout(this.run.bind(this), this.scheduleTime)
    }
  }
}

async function updateStoppedApplicationMicroserviceStatus (transaction) {
  const stoppedMicroservices = await ApplicationManager.findApplicationMicroservices({ isActivated: false }, transaction)
  await _updateMicroserviceStatusStopped(stoppedMicroservices, transaction)
}

async function _updateMicroserviceStatusStopped (stoppedMicroservices, transaction) {
  const microserviceUuids = stoppedMicroservices.map((microservice) => microservice.uuid)
  const microservices = await MicroserviceManager.findAllWithStatuses({ uuid: microserviceUuids }, transaction)
  const microserviceStatusIds = microservices
    .filter((microservice) => microservice.microserviceStatus && (microservice.microserviceStatus.status === MicroserviceStates.DELETED ||
       microservice.microserviceStatus.status === MicroserviceStates.DELETING))
    .map((microservice) => microservice.microserviceStatus.id)
  await MicroserviceStatusManager.update({ id: microserviceStatusIds }, { status: MicroserviceStates.STOPPED }, transaction)
  return microservices
}

module.exports = new FogStatusJob()
