const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceTemplateVariable = models.MicroserviceTemplateVariable

class MicroserviceTemplateVariableManager extends BaseManager {
  getEntity () {
    return MicroserviceTemplateVariable
  }
}

const instance = new MicroserviceTemplateVariableManager()
module.exports = instance
