const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceArg = models.MicroserviceArg

const microserviceArgExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid'
]

class MicroserviceArgManager extends BaseManager {
  getEntity () {
    return MicroserviceArg
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: microserviceArgExcludedFields }, transaction)
  }
}

const instance = new MicroserviceArgManager()
module.exports = instance
