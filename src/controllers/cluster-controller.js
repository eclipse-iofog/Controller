const ClusterControllerService = require('../services/cluster-controller-service')

const listClusterControllersEndPoint = async function (req) {
  return ClusterControllerService.listClusterControllers(false)
}

const getClusterControllerEndPoint = async function (req) {
  const uuid = req.params.uuid
  return ClusterControllerService.getClusterController(uuid, false)
}

const updateClusterControllerEndPoint = async function (req) {
  const uuid = req.params.uuid
  const data = req.body
  return ClusterControllerService.updateClusterController(uuid, data, false)
}

const deleteClusterControllerEndPoint = async function (req) {
  const uuid = req.params.uuid
  return ClusterControllerService.deleteClusterController(uuid, false)
}

module.exports = {
  listClusterControllersEndPoint,
  getClusterControllerEndPoint,
  updateClusterControllerEndPoint,
  deleteClusterControllerEndPoint
}
