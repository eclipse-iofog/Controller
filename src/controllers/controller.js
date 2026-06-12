const ControllerService = require('../services/controller-service')

const statusControllerEndPoint = async function (req) {
  return ControllerService.statusController(false)
}

const architecturesEndPoint = async function (req) {
  return ControllerService.getArchitectures(false)
}

module.exports = {
  statusControllerEndPoint,
  architecturesEndPoint
}
