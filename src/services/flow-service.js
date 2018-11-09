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
const ErrorMessages = require('../helpers/error-messages');
const Validation = require('../schemas');
const ChangeTrackingService = require('./change-tracking-service');

const _createFlow = async function (flowData, user, isCLI, transaction) {
  await Validation.validate(flowData, Validation.schemas.flowCreate);

  await _checkForDuplicateName(flowData.name, {}, user.id, transaction);

  const flowToCreate = {
    name: flowData.name,
    description: flowData.description,
    isActivated: flowData.isActivated,
    userId: user.id
  };

  const flowDataCreate = AppHelper.deleteUndefinedFields(flowToCreate);

  const flow = await FlowManager.create(flowDataCreate, transaction);

  return {
    id: flow.id
  }
};

const _deleteFlow = async function (flowId, user, isCLI, transaction) {
  const whereObj = {
    id: flowId,
    userId: user.id
  };
  const where = AppHelper.deleteUndefinedFields(whereObj);

  await _updateChangeTrackingsByFlowId(flowId, transaction)

  const affectedRows = await FlowManager.delete(where, transaction);

  if (affectedRows === 0) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, flowId));
  }

};

async function _updateChangeTrackingsByFlowId(flowId, transaction) {
  const flowWithMicroservices = await FlowManager.findFlowMicroservices({id: flowId}, transaction);
  const onlyUnique = (value, index, self) => self.indexOf(value) === index;
  const iofogUuids = flowWithMicroservices.microservices
    .map(obj => obj.iofogUuid)
    .filter(onlyUnique)
    .filter(val => val !== null);
  for (let iofogUuid of iofogUuids) {
    await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceFull, transaction);
  }
}

const _updateFlow = async function (flowData, flowId, user, isCLI, transaction) {
  await Validation.validate(flowData, Validation.schemas.flowUpdate);

  const oldFlow = await _getFlow(flowId, user, isCLI, transaction);
  if (!oldFlow) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_FLOW_ID)
  }
  if (flowData.name) {
    await _checkForDuplicateName(flowData.name, flowId, user.id, transaction);
  }

  const flow = {
    name: flowData.name,
    description: flowData.description,
    isActivated: flowData.isActivated,
    updatedBy: user.id
  };

  const updateFlowData = AppHelper.deleteUndefinedFields(flow);

  const where = isCLI
    ? {id: flowId}
    : {id: flowId, userId: user.id};

  await FlowManager.update(where, updateFlowData, transaction);

  if (oldFlow.isActivated !== flowData.isActivated) {
    await _updateChangeTrackingsByFlowId(flowId, transaction);
  }
};

const _getFlow = async function (flowId, user, isCLI, transaction) {
  const where = isCLI
    ? {id: flowId}
    : {id: flowId, userId: user.id};

  const flow = await FlowManager.findOneExcludeFields(where, transaction);

  if (!flow) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, flowId))
  }
  return flow
};

const _getUserFlows = async function (user, isCLI, transaction) {
  const flow = {
    userId: user.id
  };

  const flows = await FlowManager.findAllExcludeFields(flow, transaction);
  return {
    flows: flows
  }
};

const _getAllFlows = async function (isCLI, transaction) {
  const flows = await FlowManager.findAll({}, transaction);
  return {
    flows: flows
  }
};

const _checkForDuplicateName = async function (name, item, userId, transaction) {
  if (name) {
    const where = item.id
      ? {name: name, id: {[Op.ne]: item.id, userId: userId}}
      : {name: name, userId: userId};

    const result = await FlowManager.findOne(where, transaction);
    if (result) {
      throw new Errors.DuplicatePropertyError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, name));
    }
  }
};

module.exports = {
  createFlow: TransactionDecorator.generateTransaction(_createFlow),
  deleteFlow: TransactionDecorator.generateTransaction(_deleteFlow),
  updateFlow: TransactionDecorator.generateTransaction(_updateFlow),
  getFlowWithTransaction: TransactionDecorator.generateTransaction(_getFlow),
  getUserFlows: TransactionDecorator.generateTransaction(_getUserFlows),
  getAllFlows: TransactionDecorator.generateTransaction(_getAllFlows),
  getFlow: _getFlow
};
