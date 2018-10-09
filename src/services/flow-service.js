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

const _createFlow = async function (flowData, user, transaction) {
    const flow = {
        name: flowData.name,
        description: flowData.description,
        is_activated: flowData.isActivated,
        user_id: user.id
    };

    return await FlowManager.create(flow, transaction)
};

const createFlow = async function (flowData, user, transaction) {
    AppHelper.validateFields(flowData, ["name", "description", "isActivated"]);

    const flow = await _createFlow(flowData, user, transaction);

    return {
        id: flow.id
    }
};

const _deleteFlow = async function (flowId, transaction) {
    const flow = {
        id: flowId
    };

    return await FlowManager.delete(flow, transaction)
};

const deleteFlow = async function (flowId, transaction) {
    return await _deleteFlow(flowId, transaction)
};

const _updateFlow = async function (flowData, user, transaction) {
    const flow = {
        name: flowData.name,
        description: flowData.description,
        is_activated: flowData.isActivated,
        user_id: user.id
    };

    return await FlowManager.upsert(flow, transaction)
};

const updateFlow = async function (flowData, user, transaction) {
    AppHelper.validateFields(flowData, ["name", "description", "isActivated"]);

    return await _updateFlow(flowData, user, transaction);
};

const _getFlow = async function (flowId, transaction) {
    const flow = {
        id: flowId
    };

    return await FlowManager.findOne(flow, transaction)
};

const getFlow = async function (flowId, transaction) {
    return await _getFlow(flowId, transaction);
};

const _getUserFlows = async function (user, transaction) {
    const flow = {
        user_id: user.id
    };

    return await FlowManager.findAll(flow, transaction)
};

const getUserFlows = async function (user, transaction) {
    return await _getUserFlows(user, transaction);
};

module.exports = {
    createFlow: TransactionDecorator.generateTransaction(createFlow),
    deleteFlow: TransactionDecorator.generateTransaction(deleteFlow),
    updateFlow: TransactionDecorator.generateTransaction(updateFlow),
    getFlow: TransactionDecorator.generateTransaction(getFlow),
    getUserFlows: TransactionDecorator.generateTransaction(getUserFlows)
};