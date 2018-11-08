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
const AgentDecorator = require('../decorators/agent-last-active-decorator');

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
  const microserviceUuid = req.params.microserviceUuid;

  logger.info("Microservice UUID:" + JSON.stringify(microserviceUuid));

  return await AgentService.getAgentMicroservice(microserviceUuid, fog);
};

const getAgentRegistriesEndPoint = async function (req, fog) {
  return await AgentService.getAgentRegistries(fog);
};

const getAgentTunnelEndPoint = async function (req, fog) {
  return await AgentService.getAgentTunnel(fog);
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
  getAgentConfigEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(getAgentConfigEndPoint)),
  updateAgentConfigEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(updateAgentConfigEndPoint)),
  getAgentConfigChangesEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(getAgentConfigChangesEndPoint)),
  updateAgentStatusEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(updateAgentStatusEndPoint)),
  getAgentMicroservicesEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(getAgentMicroservicesEndPoint)),
  getAgentMicroserviceEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(getAgentMicroserviceEndPoint)),
  getAgentRegistriesEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(getAgentRegistriesEndPoint)),
  getAgentTunnelEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(getAgentTunnelEndPoint)),
  getAgentStraceEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(getAgentStraceEndPoint)),
  updateAgentStraceEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(updateAgentStraceEndPoint)),
  getAgentChangeVersionCommandEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(getAgentChangeVersionCommandEndPoint)),
  updateHalHardwareInfoEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(updateHalHardwareInfoEndPoint)),
  updateHalUsbInfoEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(updateHalUsbInfoEndPoint)),
  deleteNodeEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(deleteNodeEndPoint)),
  getImageSnapshotEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(getImageSnapshotEndPoint)),
  putImageSnapshotEndPoint: AuthDecorator.checkFogToken(AgentDecorator.updateLastActive(putImageSnapshotEndPoint))
};