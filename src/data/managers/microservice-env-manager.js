const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceEnv = models.MicroserviceEnv

const microserviceEnvExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid'
]

class MicroserviceEnvManager extends BaseManager {
  getEntity () {
    return MicroserviceEnv
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: microserviceEnvExcludedFields }, transaction)
  }
}

const instance = new MicroserviceEnvManager()
module.exports = instance
