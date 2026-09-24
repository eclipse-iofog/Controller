const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceEntrypoint = models.MicroserviceEntrypoint

const excludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid'
]

class MicroserviceEntrypointManager extends BaseManager {
  getEntity () {
    return MicroserviceEntrypoint
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: excludedFields }, transaction)
  }
}

const instance = new MicroserviceEntrypointManager()
module.exports = instance
