const ControllerService = require('../services/controller-service')

const liveControllerEndPoint = async function (req) {
  return ControllerService.livenessController(false)
}

const statusControllerEndPoint = async function (req) {
  return ControllerService.statusController(false)
}

const architecturesEndPoint = async function (req) {
  return ControllerService.getArchitectures(false)
}

module.exports = {
  liveControllerEndPoint,
  statusControllerEndPoint,
  architecturesEndPoint
}
