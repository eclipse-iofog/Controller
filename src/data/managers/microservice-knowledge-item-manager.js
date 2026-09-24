const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceKnowledgeItem = models.MicroserviceKnowledgeItem

class MicroserviceKnowledgeItemManager extends BaseManager {
  getEntity () {
    return MicroserviceKnowledgeItem
  }
}

const instance = new MicroserviceKnowledgeItemManager()
module.exports = instance
