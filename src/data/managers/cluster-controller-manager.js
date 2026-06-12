const BaseManager = require('./base-manager')
const ClusterController = require('../models').ClusterController

class ClusterControllerManager extends BaseManager {
  getEntity () {
    return ClusterController
  }
}

module.exports = new ClusterControllerManager()
