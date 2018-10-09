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

const FlowManager = require('../sequelize/managers/flow-manager');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');

const createFlow = async function (flow) {
    return await FlowManager.addFlow(flow)
};

const getFlowByName = async function (name) {
    return FlowManager.validateFlowByName(name);
};

async function _handleCreateFlow(flow) {
    const existingFlow = await getFlowByName(flow.name);
    if (existingFlow)
        throw new Errors.ValidationError('Creation failed: There is already a flow associated with this name. Please try another name.');
    return await createFlow(user);
}

const createNewFlow = async function (flow) {
    AppHelper.validateFields(flow, ["name", "description", "isSelected", "isActivated"]);
    return await _handleCreateFlow(flow);
};

const deleteFlow = async function (flowId) {
    return FlowManager.deleteFlow(flowId);
};

const updateFlow = async function (flow) {
    return FlowManager.updateFlow(flow);
};

const getFlow = async function (flowId) {
    return FlowManager.getFlow(flowId);
};

const getUserFlows = async function (token) {
    return FlowManager.getFlowsByUser(token);
};

module.exports = {
    createFlow: createFlow,
    createNewFlow: createNewFlow,
    getFlowByName: getFlowByName,
    deleteFlow: deleteFlow,
    updateFlow: updateFlow,
    getFlow: getFlow,
    getUserFlows: getUserFlows
};