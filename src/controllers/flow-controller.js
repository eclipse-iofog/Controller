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
const Validation = require('../schemas');

const _createFlowEndPoint = async function (req, user) {
  const flow = req.body;
  await Validation.validate(flow, Validation.schemas.flowCreate);

  logger.info("Parameters:" + JSON.stringify(flow));

  return await FlowService.createFlow(flow, user)
};

const _getFlowsByUserEndPoint = async function (req, user) {
  return await FlowService.getUserFlows(user)
};

const _getFlowEndPoint = async function (req, user) {
  const flowId = req.params.id;

  logger.info("Flow id:" + JSON.stringify(flowId))

  return await FlowService.getFlow(flowId, user)
};

const _updateFlowEndPoint = async function (req, user) {
  const flow = req.body;
  const flowId = req.params.id;

  await Validation.validate(flow, Validation.schemas.flowUpdate);

  logger.info("Parameters:" + JSON.stringify(flow))
  logger.info("Flow id:" + JSON.stringify(flowId))

  return await FlowService.updateFlow(flow, flowId, user)
};

const _deleteFlowEndPoint = async function (req, user) {
  const flowId = req.params.id;

  logger.info("Flow id:" + JSON.stringify(flowId))

  return await FlowService.deleteFlow(flowId, user)
};

module.exports = {
  createFlowEndPoint: AuthDecorator.checkAuthToken(_createFlowEndPoint),
  getFlowsByUserEndPoint: AuthDecorator.checkAuthToken(_getFlowsByUserEndPoint),
  getFlowEndPoint: AuthDecorator.checkAuthToken(_getFlowEndPoint),
  updateFlowEndPoint: AuthDecorator.checkAuthToken(_updateFlowEndPoint),
  deleteFlowEndPoint: AuthDecorator.checkAuthToken(_deleteFlowEndPoint)
};