const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceExecStatus = models.MicroserviceExecStatus

const microserviceExecStatusExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid',
  'created_at',
  'updated_at'
]

class MicroserviceExecStatusManager extends BaseManager {
  getEntity () {
    return MicroserviceExecStatus
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: microserviceExecStatusExcludedFields }, transaction)
  }
}

const instance = new MicroserviceExecStatusManager()
module.exports = instance
