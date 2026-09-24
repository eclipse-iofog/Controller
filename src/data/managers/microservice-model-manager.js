const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceModel = models.MicroserviceModel

class MicroserviceModelManager extends BaseManager {
  getEntity () {
    return MicroserviceModel
  }
}

const instance = new MicroserviceModelManager()
module.exports = instance
