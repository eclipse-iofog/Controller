const ClusterControllerService = require('../services/cluster-controller-service')

const listClusterControllersEndPoint = async function (req) {
  return ClusterControllerService.listClusterControllers()
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
