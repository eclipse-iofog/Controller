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

const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const { microserviceState, microserviceExecState } = require('../enums/microservice-state')

const Config = require('../config')
const ApplicationManager = require('../data/managers/application-manager')
const logger = require('../logger')

const scheduleTime = Config.get('settings.fogStatusUpdateInterval') * 1000

async function run () {
  try {
    const _updateStoppedApplicationMicroserviceStatus = TransactionDecorator.generateTransaction(updateStoppedApplicationMicroserviceStatus)
    const _updateStoppedMicroserviceStatus = TransactionDecorator.generateTransaction(updateStoppedMicroserviceStatus)

    // Handle microservices from deactivated applications
    await _updateStoppedApplicationMicroserviceStatus()
    // Handle individually deactivated microservices
    await _updateStoppedMicroserviceStatus()
  } catch (error) {
    logger.error('Error during stopped application status update:', error)
  } finally {
    setTimeout(run, scheduleTime)
  }
}

async function updateStoppedApplicationMicroserviceStatus (transaction) {
  // Get all deactivated applications
  const stoppedApplications = await ApplicationManager.findAllWithAttributes({ isActivated: false }, ['id'], transaction)

  if (stoppedApplications.length === 0) {
    return
  }

  // Get all microservices from these applications
  const applicationIds = stoppedApplications.map(app => app.id)
  const { Op } = require('sequelize')
  const stoppedMicroservices = await MicroserviceManager.findAllWithStatuses({ applicationId: { [Op.in]: applicationIds } }, transaction)

  await _updateMicroserviceStatusStopped(stoppedMicroservices, transaction)
}

async function updateStoppedMicroserviceStatus (transaction) {
  // Get all individually deactivated microservices (where microservice isActivated = false but parent application is still active)
  const { Op } = require('sequelize')

  // First get all active applications
  const activeApplications = await ApplicationManager.findAllWithAttributes({ isActivated: true }, ['id'], transaction)
  if (activeApplications.length === 0) {
    return
  }

  // Then get microservices that are individually deactivated but belong to active applications
  const activeApplicationIds = activeApplications.map(app => app.id)
  const stoppedMicroservices = await MicroserviceManager.findAllWithStatuses({
    isActivated: false,
    applicationId: { [Op.in]: activeApplicationIds }
  }, transaction)

  if (stoppedMicroservices.length === 0) {
    return
  }

  await _updateMicroserviceStatusStopped(stoppedMicroservices, transaction)
}

async function _updateMicroserviceStatusStopped (stoppedMicroservices, transaction) {
  const microserviceStatusIds = stoppedMicroservices
    .filter((microservice) => microservice.microserviceStatus && (microservice.microserviceStatus.status === microserviceState.DELETED ||
       microservice.microserviceStatus.status === microserviceState.DELETING))
    .map((microservice) => microservice.microserviceStatus.id)
  const microserviceExecStatusIds = stoppedMicroservices
    .filter((microservice) =>
      microservice.microserviceStatus &&
      (microservice.microserviceStatus.status === microserviceState.DELETED ||
       microservice.microserviceStatus.status === microserviceState.DELETING) &&
      microservice.microserviceExecStatus
    )
    .map((microservice) => microservice.microserviceExecStatus.id)
  await MicroserviceStatusManager.update({ id: microserviceStatusIds }, { status: microserviceState.STOPPED }, transaction)
  await MicroserviceExecStatusManager.update({ id: microserviceExecStatusIds }, { execSesssionId: '', status: microserviceExecState.INACTIVE }, transaction)
  return stoppedMicroservices
}

module.exports = {
  run
}
