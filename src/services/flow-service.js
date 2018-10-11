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
  const obj = new ObjBuilder();
  const flowToCreate = obj
    .pushFieldIfValExists('name', flowData.name)
    .pushFieldIfValExists('description', flowData.description)
    .pushFieldIfValExists('isActivated', AppHelper.validateFlowActive(flowData.isActivated))
    .pushFieldIfValExists('isSelected', AppHelper.validateFlowSelected(flowData.isSelected))
    .pushFieldIfValExists('updatedBy', user.id)
    .pushFieldIfValExists('userId', user.id)
    .popObj();

  const flowExists = await FlowManager.findOne({
    name: flowData.name
  }, transaction);

  if (flowExists){
    throw new Errors.ValidationError("Bad Request: Flow with the same name already exists")
  }

  const flow = await FlowManager.create(flowToCreate, transaction);

  return {
    id: flow.id
  }
};

const _deleteFlow = async function (flowId, transaction) {
  await _getFlow(flowId, transaction);

  return await FlowManager.delete({
    id: flowId
  }, transaction)
};

const _updateFlow = async function (flowData, flowId, user, transaction) {
  const obj = new ObjBuilder();
  const flow = obj
    .pushFieldIfValExists('name', flowData.name)
    .pushFieldIfValExists('description', flowData.description)
    .pushFieldIfValExists('isActivated', AppHelper.validateFlowActive(flowData.isActivated))
    .pushFieldIfValExists('isSelected', AppHelper.validateFlowSelected(flowData.isSelected))
    .pushFieldIfValExists('updatedBy', user.id)
    .popObj();

  await _getFlow(flowId, transaction);

  return await FlowManager.update({
      id: flowId
    }, flow, transaction)
};

const _getFlow = async function (flowId, transaction) {
  const flow = await FlowManager.findOne({
    id: flowId
  }, transaction);

  if (!flow){
    throw new Errors.NotFoundError("Invalid Flow Id")
  }

  return flow
};

const _getUserFlows = async function (user, transaction) {
  const flow = {
    user_id: user.id
  };

  return await FlowManager.findAll(flow, transaction)
};

module.exports = {
    createFlow: TransactionDecorator.generateTransaction(_createFlow),
    deleteFlow: TransactionDecorator.generateTransaction(_deleteFlow),
    updateFlow: TransactionDecorator.generateTransaction(_updateFlow),
    getFlow: TransactionDecorator.generateTransaction(_getFlow),
    getUserFlows: TransactionDecorator.generateTransaction(_getUserFlows)
};