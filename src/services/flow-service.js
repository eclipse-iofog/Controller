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

const TransactionDecorator = require('../decorators/transaction-decorator')
const FlowManager = require('../sequelize/managers/flow-manager')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const Validator = require('../schemas')
const ChangeTrackingService = require('./change-tracking-service')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

const createFlow = async function(flowData, user, isCLI, transaction) {
  await Validator.validate(flowData, Validator.schemas.flowCreate)

  await _checkForDuplicateName(flowData.name, null, user.id, transaction)

  const flowToCreate = {
    name: flowData.name,
    description: flowData.description,
    isActivated: flowData.isActivated,
    userId: user.id,
  }

  const flowDataCreate = AppHelper.deleteUndefinedFields(flowToCreate)

  const flow = await FlowManager.create(flowDataCreate, transaction)

  return {
    id: flow.id,
  }
}

const deleteFlow = async function(flowId, user, isCLI, transaction) {
  const whereObj = {
    id: flowId,
    userId: user.id,
  }
  const where = AppHelper.deleteUndefinedFields(whereObj)

  await _updateChangeTrackingsByFlowId(flowId, transaction)

  await FlowManager.delete(where, transaction)
}

const updateFlow = async function(flowData, flowId, user, isCLI, transaction) {
  await Validator.validate(flowData, Validator.schemas.flowUpdate)

  const oldFlow = await getFlow(flowId, user, isCLI, transaction)
  if (!oldFlow) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_FLOW_ID)
  }
  if (flowData.name) {
    await _checkForDuplicateName(flowData.name, flowId, user.id, transaction)
  }

  const flow = {
    name: flowData.name,
    description: flowData.description,
    isActivated: flowData.isActivated,
  }

  const updateFlowData = AppHelper.deleteUndefinedFields(flow)

  const where = isCLI
    ? {id: flowId}
    : {id: flowId, userId: user.id}

  await FlowManager.update(where, updateFlowData, transaction)

  if (oldFlow.isActivated !== flowData.isActivated) {
    await _updateChangeTrackingsByFlowId(flowId, transaction)
  }
}

const getUserFlows = async function(user, isCLI, transaction) {
  const flow = {
    userId: user.id,
  }

  const attributes = {exclude: ['created_at', 'updated_at']}
  const flows = await FlowManager.findAllWithAttributes(flow, attributes, transaction)
  return {
    flows: flows,
  }
}

const getAllFlows = async function(isCLI, transaction) {
  const attributes = {exclude: ['created_at', 'updated_at']}
  const flows = await FlowManager.findAllWithAttributes({}, attributes, transaction)
  return {
    flows: flows,
  }
}

const getFlow = async function(flowId, user, isCLI, transaction) {
  const where = isCLI
    ? {id: flowId}
    : {id: flowId, userId: user.id}

  const attributes = {exclude: ['created_at', 'updated_at']}

  const flow = await FlowManager.findOneWithAttributes(where, attributes, transaction)

  if (!flow) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, flowId))
  }
  return flow
}


const _checkForDuplicateName = async function(name, flowId, userId, transaction) {
  if (name) {
    const where = flowId
      ? {name: name, userId: userId, id: {[Op.ne]: flowId}}
      : {name: name, userId: userId}

    const result = await FlowManager.findOne(where, transaction)
    if (result) {
      throw new Errors.DuplicatePropertyError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, name))
    }
  }
}

async function _updateChangeTrackingsByFlowId(flowId, transaction) {
  const flowWithMicroservices = await FlowManager.findFlowMicroservices({id: flowId}, transaction)
  if (!flowWithMicroservices) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, flowId))
  }
  const onlyUnique = (value, index, self) => self.indexOf(value) === index
  const iofogUuids = flowWithMicroservices.microservices
      .map((obj) => obj.iofogUuid)
      .filter(onlyUnique)
      .filter((val) => val !== null)
  for (const iofogUuid of iofogUuids) {
    await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  }
}

module.exports = {
  createFlow: TransactionDecorator.generateTransaction(createFlow),
  deleteFlow: TransactionDecorator.generateTransaction(deleteFlow),
  updateFlow: TransactionDecorator.generateTransaction(updateFlow),
  getUserFlows: TransactionDecorator.generateTransaction(getUserFlows),
  getAllFlows: TransactionDecorator.generateTransaction(getAllFlows),
  getFlowWithTransaction: TransactionDecorator.generateTransaction(getFlow),
  getFlow: getFlow,
}
