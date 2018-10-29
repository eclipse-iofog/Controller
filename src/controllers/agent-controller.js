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

const AgentService = require('../services/agent-service');
const AuthDecorator = require('../decorators/authorization-decorator');

const agentProvisionEndPoint = async function (req) {
  const provisionData = req.body;

  logger.info("Parameters:" + JSON.stringify(provisionData));

  return await AgentService.agentProvision(provisionData);
};

const getAgentConfigEndPoint = async function (req, fog) {
  return await AgentService.getAgentConfig(fog);
};

const updateAgentConfigEndPoint = async function (req, fog) {
  const updateData = req.body;

  logger.info("Parameters:" + JSON.stringify(updateData));

  return await AgentService.updateAgentConfig(updateData, fog);
};

const getAgentConfigChangesEndPoint = async function (req, fog) {
  return await AgentService.getAgentConfigChanges(fog);
};

const updateAgentStatusEndPoint = async function (req, fog) {
  const agentStatus = req.body;

  logger.info("Parameters:" + JSON.stringify(agentStatus));

  return await AgentService.updateAgentStatus(agentStatus, fog);
};

const getAgentMicroservicesEndPoint = async function (req, fog) {
  return await AgentService.getAgentMicroservices(fog);
};

const getAgentMicroserviceEndPoint = async function (req, fog) {
  const microserviceId = req.params.microserviceId;

  logger.info("Microservice id:" + JSON.stringify(microserviceId));

  return await AgentService.getAgentMicroservice(microserviceId, fog);
};

const getAgentRegistriesEndPoint = async function (req, fog) {
  return await AgentService.getAgentRegistries(fog);
};

const getAgentProxyEndPoint = async function (req, fog) {
  return await AgentService.getAgentProxy(fog);
};

const getAgentStraceEndPoint = async function (req, fog) {
  return await AgentService.getAgentStrace(fog);
};

const updateAgentStraceEndPoint = async function (req, fog) {
  const straceData = req.body;

  logger.info("Parameters:" + JSON.stringify(straceData));

  return await AgentService.updateAgentStrace(straceData, fog);
};

const getAgentChangeVersionCommandEndPoint = async function (req, fog) {
  return await AgentService.getAgentChangeVersionCommand(fog);
};

const updateHalHardwareInfoEndPoint = async function (req, fog) {
  const hardwareData = req.body;

  logger.info("Parameters:" + JSON.stringify(hardwareData));

  return await AgentService.updateHalHardwareInfo(hardwareData, fog);
};

const updateHalUsbInfoEndPoint = async function (req, fog) {
  const usbData = req.body;

  logger.info("Parameters:" + JSON.stringify(usbData));

  return await AgentService.updateHalUsbInfo(usbData, fog);
};

const deleteNodeEndPoint = async function (req, fog) {
  return await AgentService.deleteNode(fog);
};

const getImageSnapshotEndPoint = async function(req, fog) {
  return await AgentService.getImageSnapshot(fog);
};

const putImageSnapshotEndPoint = async function (req, fog) {
  return await AgentService.putImageSnapshot(req, fog);
};

module.exports = {
  agentProvisionEndPoint: agentProvisionEndPoint,
  getAgentConfigEndPoint: AuthDecorator.checkFogToken(getAgentConfigEndPoint),
  updateAgentConfigEndPoint: AuthDecorator.checkFogToken(updateAgentConfigEndPoint),
  getAgentConfigChangesEndPoint: AuthDecorator.checkFogToken(getAgentConfigChangesEndPoint),
  updateAgentStatusEndPoint: AuthDecorator.checkFogToken(updateAgentStatusEndPoint),
  getAgentMicroservicesEndPoint: AuthDecorator.checkFogToken(getAgentMicroservicesEndPoint),
  getAgentMicroserviceEndPoint: AuthDecorator.checkFogToken(getAgentMicroserviceEndPoint),
  getAgentRegistriesEndPoint: AuthDecorator.checkFogToken(getAgentRegistriesEndPoint),
  getAgentProxyEndPoint: AuthDecorator.checkFogToken(getAgentProxyEndPoint),
  getAgentStraceEndPoint: AuthDecorator.checkFogToken(getAgentStraceEndPoint),
  updateAgentStraceEndPoint: AuthDecorator.checkFogToken(updateAgentStraceEndPoint),
  getAgentChangeVersionCommandEndPoint: AuthDecorator.checkFogToken(getAgentChangeVersionCommandEndPoint),
  updateHalHardwareInfoEndPoint: AuthDecorator.checkFogToken(updateHalHardwareInfoEndPoint),
  updateHalUsbInfoEndPoint: AuthDecorator.checkFogToken(updateHalUsbInfoEndPoint),
  deleteNodeEndPoint: AuthDecorator.checkFogToken(deleteNodeEndPoint),
  getImageSnapshotEndPoint: AuthDecorator.checkFogToken(getImageSnapshotEndPoint),
  putImageSnapshotEndPoint: AuthDecorator.checkFogToken(putImageSnapshotEndPoint)
};