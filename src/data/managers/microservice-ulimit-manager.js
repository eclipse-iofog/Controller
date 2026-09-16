const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceUlimit = models.MicroserviceUlimit

const excludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid'
]

class MicroserviceUlimitManager extends BaseManager {
  getEntity () {
    return MicroserviceUlimit
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: excludedFields }, transaction)
  }
}

const instance = new MicroserviceUlimitManager()
module.exports = instance
