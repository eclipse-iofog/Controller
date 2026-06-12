const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceCapDrop = models.MicroserviceCapDrop

const MicroserviceCapDropExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid'
]

class MicroserviceCapDropManager extends BaseManager {
  getEntity () {
    return MicroserviceCapDrop
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: MicroserviceCapDropExcludedFields }, transaction)
  }
}

const instance = new MicroserviceCapDropManager()
module.exports = instance
