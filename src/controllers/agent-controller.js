const AgentService = require('../services/agent-service')
const ControllerMsService = require('../services/controller-ms-service')
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

const updateAgentGpsEndPoint = async function (req, fog) {
  const updateData = req.body

  return AgentService.updateAgentGpsEndPoint(updateData, fog)
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

const getAgentLinkedVolumeMountsEndpoint = async function (req, fog) {
  return { volumeMounts: await AgentService.getAgentLinkedVolumeMounts(fog) }
}

const getAgentLogSessionsEndPoint = async function (req, fog) {
  return AgentService.getAgentLogSessions(fog)
}

const getAgentExecSessionsEndPoint = async function (req, fog) {
  return AgentService.getAgentExecSessions(fog)
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

const getControllerCAEndPoint = async function (req, fog) {
  return AgentService.getControllerCA(fog)
}

const registerControllerMicroserviceEndPoint = async function (req, fog) {
  return ControllerMsService.registerControllerMicroservice(req.body, fog)
}

module.exports = {
  agentProvisionEndPoint,
  agentDeprovisionEndPoint: AuthDecorator.checkFogToken(agentDeprovisionEndPoint),
  getAgentConfigEndPoint: AuthDecorator.checkFogToken(getAgentConfigEndPoint),
  updateAgentConfigEndPoint: AuthDecorator.checkFogToken(updateAgentConfigEndPoint),
  updateAgentGpsEndPoint: AuthDecorator.checkFogToken(updateAgentGpsEndPoint),
  getAgentConfigChangesEndPoint: AuthDecorator.checkFogToken(getAgentConfigChangesEndPoint),
  updateAgentStatusEndPoint: AuthDecorator.checkFogToken(updateAgentStatusEndPoint),
  getAgentMicroservicesEndPoint: AuthDecorator.checkFogToken(getAgentMicroservicesEndPoint),
  getAgentMicroserviceEndPoint: AuthDecorator.checkFogToken(getAgentMicroserviceEndPoint),
  getAgentRegistriesEndPoint: AuthDecorator.checkFogToken(getAgentRegistriesEndPoint),
  getAgentTunnelEndPoint: AuthDecorator.checkFogToken(getAgentTunnelEndPoint),
  getAgentChangeVersionCommandEndPoint: AuthDecorator.checkFogToken(getAgentChangeVersionCommandEndPoint),
  updateHalHardwareInfoEndPoint: AuthDecorator.checkFogToken(updateHalHardwareInfoEndPoint),
  updateHalUsbInfoEndPoint: AuthDecorator.checkFogToken(updateHalUsbInfoEndPoint),
  deleteNodeEndPoint: AuthDecorator.checkFogToken(deleteNodeEndPoint),
  resetAgentConfigChangesEndPoint: AuthDecorator.checkFogToken(resetAgentConfigChangesEndPoint),
  getAgentLinkedVolumeMountsEndpoint: AuthDecorator.checkFogToken(getAgentLinkedVolumeMountsEndpoint),
  getControllerCAEndPoint: AuthDecorator.checkFogToken(getControllerCAEndPoint),
  getAgentLogSessionsEndPoint: AuthDecorator.checkFogToken(getAgentLogSessionsEndPoint),
  getAgentExecSessionsEndPoint: AuthDecorator.checkFogToken(getAgentExecSessionsEndPoint),
  registerControllerMicroserviceEndPoint: AuthDecorator.checkFogToken(registerControllerMicroserviceEndPoint)
}
