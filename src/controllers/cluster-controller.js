const ClusterControllerService = require('../services/cluster-controller-service')
const { parseBoolean } = require('../config/parse-boolean')

const listClusterControllersEndPoint = async function (req) {
  const includeInactive = parseBoolean(req.query && req.query.includeInactive, false)
  return ClusterControllerService.listClusterControllers(includeInactive)
}

const getClusterControllerEndPoint = async function (req) {
  const uuid = req.params.uuid
  return ClusterControllerService.getClusterController(uuid)
}

const updateClusterControllerEndPoint = async function (req) {
  const uuid = req.params.uuid
  const data = req.body
  return ClusterControllerService.updateClusterController(uuid, data)
}

const deleteClusterControllerEndPoint = async function (req) {
  const uuid = req.params.uuid
  return ClusterControllerService.deleteClusterController(uuid)
}

module.exports = {
  listClusterControllersEndPoint,
  getClusterControllerEndPoint,
  updateClusterControllerEndPoint,
  deleteClusterControllerEndPoint
}
