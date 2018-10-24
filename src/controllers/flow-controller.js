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
  const flow = req.body;

  logger.info("Parameters:" + JSON.stringify(flow));

  return await FlowService.createFlowWithTransaction(flow, user, false)
};

const _getFlowsByUserEndPoint = async function (req, user) {
  return await FlowService.getUserFlows(user, false)
};

const _getFlowEndPoint = async function (req, user) {
  const flowId = req.params.id;

  logger.info("Flow id:" + JSON.stringify(flowId))

  return await FlowService.getFlowWithTransaction(flowId, user, false)
};

const _updateFlowEndPoint = async function (req, user) {
  const flow = req.body;
  const flowId = req.params.id;

  logger.info("Parameters:" + JSON.stringify(flow))
  logger.info("Flow id:" + JSON.stringify(flowId))

  return await FlowService.updateFlowWithTransaction(flow, flowId, user, false)
};

const _deleteFlowEndPoint = async function (req, user) {
  const flowId = req.params.id;

  logger.info("Flow id:" + JSON.stringify(flowId))

  return await FlowService.deleteFlowWithTransaction(flowId, user, false)
};

module.exports = {
  createFlowEndPoint: AuthDecorator.checkAuthToken(_createFlowEndPoint),
  getFlowsByUserEndPoint: AuthDecorator.checkAuthToken(_getFlowsByUserEndPoint),
  getFlowEndPoint: AuthDecorator.checkAuthToken(_getFlowEndPoint),
  updateFlowEndPoint: AuthDecorator.checkAuthToken(_updateFlowEndPoint),
  deleteFlowEndPoint: AuthDecorator.checkAuthToken(_deleteFlowEndPoint)
};