const BaseManager = require('./base-manager')
const models = require('../models')
const HTTPBasedResourceInterface = models.HTTPBasedResourceInterface
const HTTPBasedResourceInterfaceEndpoint = models.HTTPBasedResourceInterfaceEndpoint

class HTTPBasedResourceInterfacesManager extends BaseManager {
  getEntity () {
    return HTTPBasedResourceInterface
  }

  async findOneWithEndpoints (whereObj, transaction) {
    return HTTPBasedResourceInterface.findOne({
      include: [
        {
          model: HTTPBasedResourceInterfaceEndpoint,
          as: 'endpoints'
        }
      ],
      where: whereObj
    }, { transaction })
  }

  async findAllWithEndpoints (whereObj, transaction) {
    return HTTPBasedResourceInterface.findAll({
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
