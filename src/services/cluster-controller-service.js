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

const os = require('os')
const AppHelper = require('../helpers/app-helper')
const ErrorMessages = require('../helpers/error-messages')
const Errors = require('../helpers/errors')
const ClusterControllerManager = require('../data/managers/cluster-controller-manager')
const logger = require('../logger')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')

// Store current controller UUID in module scope
let currentControllerUuid = null

async function initializeControllerUuid (transaction) {
  try {
    const host = process.env.CONTROLLER_HOST || process.env.HOSTNAME || os.hostname()
    const processId = process.pid

    // Try to find existing active controller on this host
    const existing = await ClusterControllerManager.findOne({
      host,
      isActive: true
    }, transaction)

    let uuid

    if (existing) {
      // Same host restarting - reuse UUID and update heartbeat
      uuid = existing.uuid
      logger.info(`Reusing existing UUID for host ${host}: ${uuid}`)

      await ClusterControllerManager.update(
        { uuid },
        {
          lastHeartbeat: new Date(),
          isActive: true,
          processId: processId
        },
        transaction
      )
    } else {
      // New instance - generate UUID
      uuid = AppHelper.generateUUID()
      logger.info(`Generated new controller UUID: ${uuid} for host: ${host}`)

      await ClusterControllerManager.create({
        uuid,
        host,
        processId: processId,
        lastHeartbeat: new Date(),
        isActive: true
      }, transaction)
    }

    // Store UUID in module scope
    currentControllerUuid = uuid

    return uuid
  } catch (error) {
    logger.error(`Failed to initialize controller UUID: ${error.message}`)
    throw error
  }
}

function getCurrentControllerUuid () {
  return currentControllerUuid
}

async function updateHeartbeat (uuid, transaction) {
  if (!uuid) {
    uuid = currentControllerUuid
  }

  if (!uuid) {
    logger.warn('Cannot update heartbeat: controller UUID not initialized')
    return
  }

  await ClusterControllerManager.update(
    { uuid },
    {
      lastHeartbeat: new Date(),
      isActive: true
    },
    transaction
  )
}

async function listClusterControllers (transaction) {
  const controllers = await ClusterControllerManager.findAll({}, transaction)
  return controllers.map(controller => ({
    uuid: controller.uuid,
    host: controller.host,
    processId: controller.processId,
    lastHeartbeat: controller.lastHeartbeat,
    isActive: controller.isActive,
    createdAt: controller.createdAt,
    updatedAt: controller.updatedAt
  }))
}

async function getClusterController (uuid, transaction) {
  const controller = await ClusterControllerManager.findOne({ uuid }, transaction)
  if (!controller) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CLUSTER_CONTROLLER_NOT_FOUND))
  }
  return {
    uuid: controller.uuid,
    host: controller.host,
    processId: controller.processId,
    lastHeartbeat: controller.lastHeartbeat,
    isActive: controller.isActive,
    createdAt: controller.createdAt,
    updatedAt: controller.updatedAt
  }
}

async function updateClusterController (uuid, data, transaction) {
  await Validator.validate(data, Validator.schemas.clusterControllerUpdate)

  const controller = await ClusterControllerManager.findOne({ uuid }, transaction)
  if (!controller) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CLUSTER_CONTROLLER_NOT_FOUND))
  }

  const updateData = AppHelper.deleteUndefinedFields({
    host: data.host
  })

  await ClusterControllerManager.update({ uuid }, updateData, transaction)
  return getClusterController(uuid, transaction)
}

async function deleteClusterController (uuid, transaction) {
  const controller = await ClusterControllerManager.findOne({ uuid }, transaction)
  if (!controller) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CLUSTER_CONTROLLER_NOT_FOUND))
  }

  // Soft delete: mark as inactive instead of deleting (for audit trail)
  await ClusterControllerManager.update(
    { uuid },
    { isActive: false },
    transaction
  )
  return { uuid }
}

module.exports = {
  initializeControllerUuid: TransactionDecorator.generateTransaction(initializeControllerUuid),
  getCurrentControllerUuid,
  updateHeartbeat: TransactionDecorator.generateTransaction(updateHeartbeat),
  listClusterControllers: TransactionDecorator.generateTransaction(listClusterControllers),
  getClusterController: TransactionDecorator.generateTransaction(getClusterController),
  updateClusterController: TransactionDecorator.generateTransaction(updateClusterController),
  deleteClusterController: TransactionDecorator.generateTransaction(deleteClusterController)
}
