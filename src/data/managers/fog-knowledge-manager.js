const BaseManager = require('./base-manager')
const models = require('../models')
const FogKnowledge = models.FogKnowledge

class FogKnowledgeManager extends BaseManager {
  getEntity () {
    return FogKnowledge
  }
}

const instance = new FogKnowledgeManager()
module.exports = instance
