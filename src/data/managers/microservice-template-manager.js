const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceTemplate = models.MicroserviceTemplate

const excludedFields = [
  'created_at',
  'updated_at'
]

const variablesInclude = {
  model: models.MicroserviceTemplateVariable,
  as: 'variables',
  required: false,
  attributes: { exclude: excludedFields }
}

class MicroserviceTemplateManager extends BaseManager {
  getEntity () {
    return MicroserviceTemplate
  }

  findOne (where, transaction) {
    return MicroserviceTemplate.findOne({
      where,
      attributes: { exclude: excludedFields },
      transaction
    })
  }

  findAll (where, transaction) {
    return MicroserviceTemplate.findAll({
      where,
      attributes: { exclude: excludedFields },
      transaction
    })
  }

  findOnePopulated (where, transaction) {
    return MicroserviceTemplate.findOne({
      include: [variablesInclude],
      where,
      attributes: { exclude: excludedFields },
      transaction
    })
  }

  findAllPopulated (where, transaction) {
    return MicroserviceTemplate.findAll({
      include: [variablesInclude],
      where,
      attributes: { exclude: excludedFields },
      transaction
    })
  }
}

const instance = new MicroserviceTemplateManager()
module.exports = instance
