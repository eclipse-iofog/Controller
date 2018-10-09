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

const logger = require('../logger');
const AuthDecorator = require('./../decorators/authorization-decorator');
const FlowService = require('../services/flow-service');

const _createFlowEndPoint = async function (req, user) {

    logger.info("Parameters:" + JSON.stringify(req.body));

    const flow = req.body;

    return await FlowService.createFlow(flow, user);
};

const _getFlowsByUserEndPoint = async function (req, user) {

    return await FlowService.getUserFlows(user);
};

const _getFlowEndPoint = async function (req, user) {

    // get flow id from path parameters
    logger.info("Flow id:" + JSON.stringify(req.params.id));

    const flowId = req.params.id;

    return await FlowService.getFlow(flowId);
};

const _updateFlowEndPoint = async function (req, user) {

    // get flow id from path parameters
    logger.info("Parameters:" + JSON.stringify(req.body));
    logger.info("Flow id:" + JSON.stringify(req.params.id));

    // add id to body
    const flow = req.body;

    return await FlowService.updateFlow(flow, user);
};

const _deleteFlowEndPoint = async function (req, user) {

    // get flow id from path parameters
    logger.info("Flow id:" + JSON.stringify(req.params.id));

    const flowId = req.params.id;

    return await FlowService.deleteFlow(flowId);
};

module.exports = {
    createFlowEndPoint: AuthDecorator.checkAuthToken(_createFlowEndPoint),
    getFlowsByUserEndPoint: AuthDecorator.checkAuthToken(_getFlowsByUserEndPoint),
    getFlowEndPoint: AuthDecorator.checkAuthToken(_getFlowEndPoint),
    updateFlowEndPoint: AuthDecorator.checkAuthToken(_updateFlowEndPoint),
    deleteFlowEndPoint: AuthDecorator.checkAuthToken(_deleteFlowEndPoint)
};