const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceLogStatus = models.MicroserviceLogStatus

const microserviceLogStatusExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid',
  'created_at',
  'updated_at'
]

class MicroserviceLogStatusManager extends BaseManager {
  getEntity () {
    return MicroserviceLogStatus
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: microserviceLogStatusExcludedFields }, transaction)
  }
}

const instance = new MicroserviceLogStatusManager()
module.exports = instance
