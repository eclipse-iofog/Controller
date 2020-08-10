/*
 * *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const AgentService = require('../services/agent-service')
const AuthDecorator = require('../decorators/authorization-decorator')

const agentProvisionEndPoint = async function (req) {
  const provisionData = req.body

  return AgentService.agentProvision(provisionData)
}

const agentDeprovisionEndPoint = async function (req, fog) {
  const deprovisionData = req.body

  return AgentService.agentDeprovision(deprovisionData, fog)
}

const getAgentConfigEndPoint = async function (req, fog) {
  return AgentService.getAgentConfig(fog)
}

const updateAgentConfigEndPoint = async function (req, fog) {
  const updateData = req.body

  return AgentService.updateAgentConfig(updateData, fog)
}

const getAgentConfigChangesEndPoint = async function (req, fog) {
  return AgentService.getAgentConfigChanges(fog)
}

const resetAgentConfigChangesEndPoint = async function (req, fog) {
  return AgentService.resetAgentConfigChanges(fog, req.body)
}

const updateAgentStatusEndPoint = async function (req, fog) {
  const agentStatus = req.body

  return AgentService.updateAgentStatus(agentStatus, fog)
}

const getAgentMicroservicesEndPoint = async function (req, fog) {
  return AgentService.getAgentMicroservices(fog)
}

const getAgentMicroserviceEndPoint = async function (req, fog) {
  const microserviceUuid = req.params.microserviceUuid

  return AgentService.getAgentMicroservice(microserviceUuid, fog)
}

const getAgentRegistriesEndPoint = async function (req, fog) {
  return AgentService.getAgentRegistries(fog)
}

const getAgentTunnelEndPoint = async function (req, fog) {
  return AgentService.getAgentTunnel(fog)
}

const getAgentStraceEndPoint = async function (req, fog) {
  return AgentService.getAgentStrace(fog)
}

const updateAgentStraceEndPoint = async function (req, fog) {
  const straceData = req.body

  return AgentService.updateAgentStrace(straceData, fog)
}

const getAgentChangeVersionCommandEndPoint = async function (req, fog) {
  return AgentService.getAgentChangeVersionCommand(fog)
}

const updateHalHardwareInfoEndPoint = async function (req, fog) {
  const hardwareData = req.body

  return AgentService.updateHalHardwareInfo(hardwareData, fog)
}

const updateHalUsbInfoEndPoint = async function (req, fog) {
  const usbData = req.body

  return AgentService.updateHalUsbInfo(usbData, fog)
}

const deleteNodeEndPoint = async function (req, fog) {
  return AgentService.deleteNode(fog)
}

const getImageSnapshotEndPoint = async function (req, fog) {
  return AgentService.getImageSnapshot(fog)
}

const putImageSnapshotEndPoint = async function (req, fog) {
  return AgentService.putImageSnapshot(req, fog)
}

async function postTrackingEndPoint (req, fog) {
  const events = req.body.events
  return AgentService.postTracking(events, fog)
}

module.exports = {
  agentProvisionEndPoint: agentProvisionEndPoint,
  agentDeprovisionEndPoint: AuthDecorator.checkFogToken(agentDeprovisionEndPoint),
  getAgentConfigEndPoint: AuthDecorator.checkFogToken(getAgentConfigEndPoint),
  updateAgentConfigEndPoint: AuthDecorator.checkFogToken(updateAgentConfigEndPoint),
  getAgentConfigChangesEndPoint: AuthDecorator.checkFogToken(getAgentConfigChangesEndPoint),
  updateAgentStatusEndPoint: AuthDecorator.checkFogToken(updateAgentStatusEndPoint),
  getAgentMicroservicesEndPoint: AuthDecorator.checkFogToken(getAgentMicroservicesEndPoint),
  getAgentMicroserviceEndPoint: AuthDecorator.checkFogToken(getAgentMicroserviceEndPoint),
  getAgentRegistriesEndPoint: AuthDecorator.checkFogToken(getAgentRegistriesEndPoint),
  getAgentTunnelEndPoint: AuthDecorator.checkFogToken(getAgentTunnelEndPoint),
  getAgentStraceEndPoint: AuthDecorator.checkFogToken(getAgentStraceEndPoint),
  updateAgentStraceEndPoint: AuthDecorator.checkFogToken(updateAgentStraceEndPoint),
  getAgentChangeVersionCommandEndPoint: AuthDecorator.checkFogToken(getAgentChangeVersionCommandEndPoint),
  updateHalHardwareInfoEndPoint: AuthDecorator.checkFogToken(updateHalHardwareInfoEndPoint),
  updateHalUsbInfoEndPoint: AuthDecorator.checkFogToken(updateHalUsbInfoEndPoint),
  deleteNodeEndPoint: AuthDecorator.checkFogToken(deleteNodeEndPoint),
  getImageSnapshotEndPoint: AuthDecorator.checkFogToken(getImageSnapshotEndPoint),
  putImageSnapshotEndPoint: AuthDecorator.checkFogToken(putImageSnapshotEndPoint),
  postTrackingEndPoint: AuthDecorator.checkFogToken(postTrackingEndPoint),
  resetAgentConfigChangesEndPoint: AuthDecorator.checkFogToken(resetAgentConfigChangesEndPoint)
}
