const BaseManager = require('./base-manager')
const models = require('../models')
const ApplicationTemplate = models.ApplicationTemplate

class ApplicationTemplateManager extends BaseManager {
  getEntity () {
    return ApplicationTemplate
  }

  async findOnePopulated (where, attributes, transaction) {
    const applicationTemplate = await ApplicationTemplate.findOne({
      include: [
        {
          model: models.ApplicationTemplateVariable,
          as: 'variables',
          required: false
        }
      ],
      where,
      attributes
    }, { transaction })
    return applicationTemplate
  }

  async findAllPopulated (where, attributes, transaction) {
    const applicationTemplates = await ApplicationTemplate.findAll({
      include: [
        {
          model: models.ApplicationTemplateVariable,
          as: 'variables',
          required: false
        }
      ],
      where,
      attributes
    }, { transaction })
    return applicationTemplates
  }
}

const instance = new ApplicationTemplateManager()
module.exports = instance
