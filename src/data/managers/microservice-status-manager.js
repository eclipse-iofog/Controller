const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceStatus = models.MicroserviceStatus

const microserviceStatusExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid',
  'created_at',
  'updated_at'
]

class MicroserviceStatusManager extends BaseManager {
  getEntity () {
    return MicroserviceStatus
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: microserviceStatusExcludedFields }, transaction)
  }
}

const instance = new MicroserviceStatusManager()
module.exports = instance
