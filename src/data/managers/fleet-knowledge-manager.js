const BaseManager = require('./base-manager')
const models = require('../models')
const FleetKnowledge = models.FleetKnowledge

const knowledgeExcludedFields = [
  'created_at',
  'updated_at'
]

class FleetKnowledgeManager extends BaseManager {
  getEntity () {
    return FleetKnowledge
  }

  findOne (where, transaction) {
    return FleetKnowledge.findOne({
      where,
      attributes: { exclude: knowledgeExcludedFields },
      transaction
    })
  }

  findAll (where, transaction) {
    return FleetKnowledge.findAll({
      where,
      attributes: { exclude: knowledgeExcludedFields },
      transaction
    })
  }
}

const instance = new FleetKnowledgeManager()
module.exports = instance
