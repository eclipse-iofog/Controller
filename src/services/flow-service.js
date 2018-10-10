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
const ObjBuilder = require('../helpers/object-builder')

const _createFlow = async function (flowData, user, transaction) {
  const flowToCreate = {
    name: flowData.name,
    description: flowData.description,
    is_activated: flowData.isActivated,
    is_selected: flowData.isSelected,
    user_id: user.id,
    updated_by: user.id
  };

  const flow = await FlowManager.findOne({
    name: flowData.name
  }, transaction);

  if (flow){
    throw Errors.ValidationError("Bad Request: Flow with the same name already exists")
  }

  return await FlowManager.create(flowToCreate, transaction)
};

const createFlow = async function (flowData, user, transaction) {
  const flow = await _createFlow(flowData, user, transaction);

  return {
    id: flow.id
   }
};

const _deleteFlow = async function (flowId, transaction) {
  const flow = await _getFlow(flowId, transaction);

  return await FlowManager.delete(flow, transaction)
};

const deleteFlow = async function (flowId, transaction) {
  return await _deleteFlow(flowId, transaction)
};

const _updateFlow = async function (flowData, flowId, transaction) {
  const flow = await _getFlow(flowId, transaction);

  return await FlowManager.update(flow, flowData, transaction)
};

const updateFlow = async function (flowData, flowId, user, transaction) {
  const obj = new ObjBuilder()
  const flow = obj
    .pushFieldIfValExists('name', flowData.name)
    .pushFieldIfValExists('description', flowData.description)
    .pushFieldIfValExists('is_activated', AppHelper.validateFlowActive(flowData.isActivated))
    .pushFieldIfValExists('is_selected', AppHelper.validateFlowSelected(flowData.isSelected))
    .pushFieldIfValExists('updated_by', user.id)
    .popObj()

  return await _updateFlow(flow, flowId, transaction)
};

const _getFlow = async function (flowId, transaction) {
  const flow = await FlowManager.findOne({
    id: flowId
  }, transaction)

  if (!flow){
    throw Errors.NotFoundError("Invalid Flow Id")
  }

  return flow
};

const getFlow = async function (flowId, transaction) {
  return await _getFlow(flowId, transaction)
};

const getUserFlows = async function (user, transaction) {
  const flow = {
    user_id: user.id
  };

  return await FlowManager.findAll(flow, transaction)
};

module.exports = {
    createFlow: TransactionDecorator.generateTransaction(createFlow),
    deleteFlow: TransactionDecorator.generateTransaction(deleteFlow),
    updateFlow: TransactionDecorator.generateTransaction(updateFlow),
    getFlow: TransactionDecorator.generateTransaction(getFlow),
    getUserFlows: TransactionDecorator.generateTransaction(getUserFlows)
};