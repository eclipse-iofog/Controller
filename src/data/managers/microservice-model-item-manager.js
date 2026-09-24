const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceModelItem = models.MicroserviceModelItem

class MicroserviceModelItemManager extends BaseManager {
  getEntity () {
    return MicroserviceModelItem
  }
}

const instance = new MicroserviceModelItemManager()
module.exports = instance
