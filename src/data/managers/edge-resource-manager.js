const BaseManager = require('./base-manager')
const models = require('../models')
const EdgeResource = models.EdgeResource

class EdgeResourcesManager extends BaseManager {
  getEntity () {
    return EdgeResource
  }
}

const instance = new EdgeResourcesManager()
module.exports = instance
