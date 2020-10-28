const BaseManager = require('./base-manager')
const models = require('../models')
const HTTPBasedResourceInterface = models.HTTPBasedResourceInterface
const HTTPBasedResourceInterfaceEndpoint = models.HTTPBasedResourceInterfaceEndpoint

class HTTPBasedResourceInterfacesManager extends BaseManager {
  getEntity () {
    return HTTPBasedResourceInterface
  }

  async findOneWithEndpoints (whereObj, transaction) {
    HTTPBasedResourceInterface.findOne({
      include: [
        {
          model: HTTPBasedResourceInterfaceEndpoint,
          as: 'endpoints'
        }
      ],
      where: whereObj
    }, { transaction })
  }
}

const instance = new HTTPBasedResourceInterfacesManager()
module.exports = instance
