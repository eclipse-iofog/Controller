const BaseManager = require('./base-manager')
const models = require('../models')
const { EdgeResource, Tags } = models

class EdgeResourcesManager extends BaseManager {
  getEntity () {
    return EdgeResource
  }

  findAllWithOrchestrationTags (whereObj, transaction) {
    return EdgeResource.findAll({
      include: [
        {
          model: Tags,
          as: 'orchestrationTags'
        }
      ],
      where: whereObj
    }, { transaction })
  }

  findOneWithOrchestrationTags (whereObj, transaction) {
    return EdgeResource.findOne({
      include: [
        {
          model: Tags,
          as: 'orchestrationTags'
        }
      ],
      where: whereObj
    }, { transaction })
  }
}

const instance = new EdgeResourcesManager()
module.exports = instance
