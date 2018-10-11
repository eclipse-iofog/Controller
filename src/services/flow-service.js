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

const TransactionDecorator = require('../decorators/transaction-decorator');
const FlowManager = require('../sequelize/managers/flow-manager');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');

const _createFlow = async function (flowData, user, transaction) {
  await isFlowExist(flowData.name, transaction);

  const flowToCreate = {
    name: flowData.name,
    description: flowData.description,
    isActivated: flowData.isActivated ? AppHelper.validateFlowActive(flowData.isActivated) : false,
    isSelected: flowData.isSelected ? AppHelper.validateFlowActive(flowData.isSelected) : false,
    userId: user.id
  };

  const flowDataCreate = AppHelper.deleteUndefinedFields(flowToCreate);

  const flow = await FlowManager.create(flowDataCreate, transaction);

  return {
    id: flow.id
  }
};

const _deleteFlow = async function (flowId, transaction) {
  await _getFlow(flowId, transaction);

  await FlowManager.delete({
    id: flowId
  }, transaction)
};

const _updateFlow = async function (flowData, flowId, user, transaction) {
  if (flowData.name !== undefined){
      await isFlowExist(flowData.name, transaction);
  }

  const flow = {
      name: flowData.name,
      description: flowData.description,
      isActivated: AppHelper.validateFlowActive(flowData.isActivated),
      isSelected: AppHelper.validateFlowSelected(flowData.isSelected),
      updatedBy: user.id
  };

  const updateFlowData = AppHelper.deleteUndefinedFields(flow);

  await _getFlow(flowId, transaction);

  return await FlowManager.update({
      id: flowId
    }, updateFlowData, transaction)
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

const isFlowExist = async function (flowName, transaction) {
    const flow = await FlowManager.findOne({
        name: flowName
    }, transaction);

    if (flow){
        throw new Errors.ValidationError("Bad Request: Flow with the same name already exists")
    }
};

module.exports = {
    createFlow: TransactionDecorator.generateTransaction(_createFlow),
    deleteFlow: TransactionDecorator.generateTransaction(_deleteFlow),
    updateFlow: TransactionDecorator.generateTransaction(_updateFlow),
    getFlow: TransactionDecorator.generateTransaction(_getFlow),
    getUserFlows: TransactionDecorator.generateTransaction(_getUserFlows)
};