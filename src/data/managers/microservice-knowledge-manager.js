const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceKnowledge = models.MicroserviceKnowledge

class MicroserviceKnowledgeManager extends BaseManager {
  getEntity () {
    return MicroserviceKnowledge
  }
}

const instance = new MicroserviceKnowledgeManager()
module.exports = instance
