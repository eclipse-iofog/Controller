const BaseManager = require('./base-manager')
const models = require('../models')
const Application = models.Application
const Microservice = models.Microservice

class ApplicationManager extends BaseManager {
  getEntity () {
    return Application
  }

  async findApplicationMicroservices (where, transaction) {
    const application = await Application.findOne({
      include: [
        {
          model: Microservice,
          as: 'microservices',
          required: false
        }
      ],
      where,
      attributes: ['id']
    }, { transaction })
    if (!application) {
      return []
    }
    return application.microservices || []
  }

  async findAllWithAttributes (where, attributes, transaction) {
    return Application.findAll({
      where,
      attributes
    },
    { transaction })
  }

  async findOneWithAttributes (where, attributes, transaction) {
    return Application.findOne({
      where,
      attributes
    },
    { transaction })
  }

  async findOnePopulated (where, attributes, transaction) {
    const application = await Application.findOne({
      include: [
        {
          model: Microservice,
          as: 'microservices',
          required: false
        }
      ],
      where,
      attributes
    }, { transaction })
    if (!application) {
      return null
    }
    const msvcs = application.microservices || []
    return {
      ...application.get({ plain: true }),
      microservices: msvcs.map(m => m.get({ plain: true }))
    }
  }

  async findAllPopulated (where, attributes, transaction) {
    const applications = await Application.findAll({
      include: [
        {
          model: Microservice,
          as: 'microservices',
          required: false
        }
      ],
      where,
      attributes
    }, { transaction })
    return applications.map(application => ({
      ...application.get({ plain: true }),
      microservices: (application.microservices || []).map(m => m.get({ plain: true }))
    }))
  }
}

const instance = new ApplicationManager()
module.exports = instance
