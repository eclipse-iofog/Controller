const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceHealthCheck = models.MicroserviceHealthCheck

const microserviceHealthCheckExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid',
  'created_at',
  'updated_at'
]

class MicroserviceHealthCheckManager extends BaseManager {
  getEntity () {
    return MicroserviceHealthCheck
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: microserviceHealthCheckExcludedFields }, transaction)
  }
}

const instance = new MicroserviceHealthCheckManager()
module.exports = instance
