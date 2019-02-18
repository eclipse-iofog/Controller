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

const AuthDecorator = require('./../decorators/authorization-decorator');
const FlowService = require('../services/flow-service');

const createFlowEndPoint = async function (req, user) {
  const flow = req.body;

  return await FlowService.createFlow(flow, user, false)
};

const getFlowsByUserEndPoint = async function (req, user) {
  return await FlowService.getUserFlows(user, false)
};

const getFlowEndPoint = async function (req, user) {
  const flowId = req.params.id;

  return await FlowService.getFlowWithTransaction(flowId, user, false)
};

const updateFlowEndPoint = async function (req, user) {
  const flow = req.body;
  const flowId = req.params.id;

  return await FlowService.updateFlow(flow, flowId, user, false)
};

const deleteFlowEndPoint = async function (req, user) {
  const flowId = req.params.id;

  return await FlowService.deleteFlow(flowId, user, false)
};

module.exports = {
  createFlowEndPoint: AuthDecorator.checkAuthToken(createFlowEndPoint),
  getFlowsByUserEndPoint: AuthDecorator.checkAuthToken(getFlowsByUserEndPoint),
  getFlowEndPoint: AuthDecorator.checkAuthToken(getFlowEndPoint),
  updateFlowEndPoint: AuthDecorator.checkAuthToken(updateFlowEndPoint),
  deleteFlowEndPoint: AuthDecorator.checkAuthToken(deleteFlowEndPoint)
};