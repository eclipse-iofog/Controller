const BaseManager = require('./base-manager')
const models = require('../models')
const HTTPBasedResourceInterfaceEndpoint = models.HTTPBasedResourceInterfaceEndpoint

class HTTPBasedResourceInterfaceEndpointsManager extends BaseManager {
  getEntity () {
    return HTTPBasedResourceInterfaceEndpoint
  }
}

const instance = new HTTPBasedResourceInterfaceEndpointsManager()
module.exports = instance
