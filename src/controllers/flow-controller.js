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

const FlowService = require('../services/flow-service');

const flowCreateEndPoint = async function (req) {

    logger.info("Parameters:" + JSON.stringify(req.body));

    const flow = req.body;

    return await FlowService.createNewFlow(flow);
};

const flowsByUserEndPoint = async function (req) {

    // get user id from header
    logger.info("User id:" + JSON.stringify(req.header));

    const token = req.header;

    return await FlowService.getUserFlows(token);
};

const flowGetEndPoint = async function (req) {

    // get flow id from path parameters
    logger.info("Flow id:" + JSON.stringify(req.params.id));

    const flowId = req.params.id;

    return await FlowService.getFlow(flowId);
};

const flowUpdateEndPoint = async function (req) {

    // get flow id from path parameters
    logger.info("Parameters:" + JSON.stringify(req.body));
    logger.info("Flow id:" + JSON.stringify(req.params.id));

    // add id to body
    const flow = req.body;

    return await FlowService.updateFlow(flow);
};

const flowDeleteEndPoint = async function (req) {

    // get flow id from path parameters
    logger.info("Flow id:" + JSON.stringify(req.params.id));

    const flowId = req.params.id;

    return await FlowService.deleteFlow(flowId);
};

module.exports = {
    flowCreateEndPoint: flowCreateEndPoint,
    flowsByUserEndPoint: flowsByUserEndPoint,
    flowGetEndPoint: flowGetEndPoint,
    flowUpdateEndPoint: flowUpdateEndPoint,
    flowDeleteEndPoint: flowDeleteEndPoint
};