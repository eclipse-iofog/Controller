const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceTmpfs = models.MicroserviceTmpfs

const excludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid'
]

class MicroserviceTmpfsManager extends BaseManager {
  getEntity () {
    return MicroserviceTmpfs
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: excludedFields }, transaction)
  }
}

const instance = new MicroserviceTmpfsManager()
module.exports = instance
