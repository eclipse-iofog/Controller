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

const TransactionDecorator = require('../decorators/transaction-decorator')

const FogManager = require('../data/managers/iofog-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const MicroserviceService = require('../services/microservices-service')
const { microserviceState, microserviceExecState } = require('../enums/microservice-state')
const FogStates = require('../enums/fog-state')
const Config = require('../config')
const logger = require('../logger')

const scheduleTime = Config.get('settings.fogStatusUpdateInterval') * 1000

async function run () {
  try {
    const _updateFogsConnectionStatus = TransactionDecorator.generateTransaction(updateFogsConnectionStatus)
    await _updateFogsConnectionStatus()
  } catch (error) {
    logger.error('Error during fog status update:', error)
  } finally {
    setTimeout(run, scheduleTime)
  }
}

async function updateFogsConnectionStatus (transaction) {
  const unknownFogUuids = await _updateFogStatus(transaction)
  const microservices = await _updateMicroserviceStatus(unknownFogUuids, transaction)
  await _deleteNotRunningMicroservices(microservices, transaction)
}

async function _updateFogStatus (transaction) {
  const statusUpdateTolerance = Config.get('settings.fogStatusUpdateTolerance')
  const fogs = [
    ...await FogManager.findAll({ daemonStatus: FogStates.RUNNING }, transaction),
    ...await FogManager.findAll({ daemonStatus: FogStates.WARNING }, transaction)
  ]
  const unknownFogUuids = fogs
    .filter((fog) => {
      const statusUpdateToleranceMs = fog.statusFrequency * 1000 * statusUpdateTolerance
      return (Date.now() - fog.lastStatusTime) > statusUpdateToleranceMs
    })
    .map((fog) => fog.uuid)

  const where = { uuid: unknownFogUuids }
  const data = { daemonStatus: FogStates.UNKNOWN }
  await FogManager.update(where, data, transaction)
  return unknownFogUuids
}

async function _updateMicroserviceStatus (unknownFogUuids, transaction) {
  const microservices = await MicroserviceManager.findAllWithStatuses({ iofogUuid: unknownFogUuids }, transaction)

  // Filter out inactive microservices that are already STOPPED - they should not be updated to UNKNOWN
  const microserviceStatusIds = microservices
    .filter((microservice) => {
      // Skip if no microservice status
      if (!microservice.microserviceStatus) {
        return false
      }
      // Skip if microservice is inactive and already STOPPED
      if (!microservice.isActivated && microservice.microserviceStatus.status === microserviceState.STOPPED) {
        return false
      }
      return true
    })
    .map((microservice) => microservice.microserviceStatus.id)

  const microserviceExecStatusIds = microservices
    .filter((microservice) => {
      // Skip if no exec status
      if (!microservice.microserviceExecStatus) {
        return false
      }
      // Skip if microservice is inactive and already STOPPED
      if (!microservice.isActivated && microservice.microserviceStatus && microservice.microserviceStatus.status === microserviceState.STOPPED) {
        return false
      }
      return true
    })
    .map((microservice) => microservice.microserviceExecStatus.id)

  await MicroserviceStatusManager.update({ id: microserviceStatusIds }, { status: microserviceState.UNKNOWN }, transaction)
  await MicroserviceExecStatusManager.update({ id: microserviceExecStatusIds }, { execSesssionId: '', status: microserviceExecState.INACTIVE }, transaction)
  return microservices
}

async function _deleteNotRunningMicroservices (microservices, transaction) {
  for (const microservice of microservices) {
    if (microservice.delete) {
      await MicroserviceService.deleteMicroserviceWithRoutesAndPortMappings(microservice, transaction)
    }
  }
}

module.exports = {
  run
}
