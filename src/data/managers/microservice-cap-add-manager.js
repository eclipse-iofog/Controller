const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceCapAdd = models.MicroserviceCapAdd

const MicroserviceCapAddExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid'
]

class MicroserviceCapAddManager extends BaseManager {
  getEntity () {
    return MicroserviceCapAdd
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: MicroserviceCapAddExcludedFields }, transaction)
  }
}

const instance = new MicroserviceCapAddManager()
module.exports = instance
