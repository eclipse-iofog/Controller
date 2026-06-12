const BaseManager = require('./base-manager')
const models = require('../models')
const ApplicationTemplateVariable = models.ApplicationTemplateVariable

class ApplicationTemplateVariableManager extends BaseManager {
  getEntity () {
    return ApplicationTemplateVariable
  }
}

const instance = new ApplicationTemplateVariableManager()
module.exports = instance
