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
const MicroserviceService = require('./microservices-service')
const ChangeTrackingManager = require('../sequelize/managers/change-tracking-manager')

const _createFlow = async function (flowData, user, isCLI, transaction) {
  await Validation.validate(flowData, Validation.schemas.flowCreate);

  await isFlowExist(flowData.name, transaction);

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

  const affectedRows = await FlowManager.delete(where, transaction);

  if (affectedRows === 0) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, flowId));
  }
};

const _updateFlow = async function (flowData, flowId, user, isCLI, transaction) {
    await Validation.validate(flowData, Validation.schemas.flowUpdate);

    const oldFlow = await _getFlow(flowId, user, isCLI, transaction);

    if (!oldFlow) {
      throw new Errors.NotFoundError(ErrorMessages.INVALID_FLOW_ID)
    }
    if (flowData.name !== undefined) {
      await isFlowExist(flowData.name, transaction);
    }

    const flow = {
      name: flowData.name,
      description: flowData.description,
      isActivated: flowData.isActivated,
      updatedBy: user.id
    };

    const updateFlowData = AppHelper.deleteUndefinedFields(flow);

    const where = isCLI ?
      {
        id: flowId
      }
      :
      {
        id: flowId,
        userId: user.id
      };

    await FlowManager.update(where, updateFlowData, transaction);

    if (oldFlow.isActivated !== flowData.isActivated) {
      const msList = await MicroserviceService.getListMicroservices({flowId: flowId}, user, isCLI, transaction)
      for (const ms of msList) {
        const updateChangeTrackingData = {
          containerConfig: true,
          containerList: true,
          routing: true
        }
        await ChangeTrackingManager.update({iofogUuid: ms.iofogUuid}, updateChangeTrackingData, transaction);
      }
    }
};

const _getFlow = async function (flowId, user, isCLI, transaction) {
  const whereObj = {
    id: flowId,
    userId: user.id
  };
  const where = AppHelper.deleteUndefinedFields(whereObj);

  const flow = await FlowManager.findOne(where, transaction);

  if (!flow) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, flowId))
  }

  return flow
};

const _getUserFlows = async function (user, isCLI, transaction) {
  const flow = {
    userId: user.id
  };

  return await FlowManager.findAll(flow, transaction)
};

const _getAllFlows = async function (isCLI, transaction) {
  return await FlowManager.findAll({}, transaction);
};

const isFlowExist = async function (flowName, transaction) {
  const flow = await FlowManager.findOne({
    name: flowName
  }, transaction);

  if (flow) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, flowName));
  }
};

module.exports = {
  createFlowWithTransaction: TransactionDecorator.generateTransaction(_createFlow),
  deleteFlowWithTransaction: TransactionDecorator.generateTransaction(_deleteFlow),
  updateFlowWithTransaction: TransactionDecorator.generateTransaction(_updateFlow),
  getFlowWithTransaction: TransactionDecorator.generateTransaction(_getFlow),
  getUserFlowsWithTransaction: TransactionDecorator.generateTransaction(_getUserFlows),
  getAllFlowsWithTransaction: TransactionDecorator.generateTransaction(_getAllFlows),
  getFlow: _getFlow
};
