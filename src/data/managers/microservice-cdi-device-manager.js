const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceCdiDev = models.MicroserviceCdiDev

const MicroserviceCdiDevExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid'
]

class MicroserviceCdiDevManager extends BaseManager {
  getEntity () {
    return MicroserviceCdiDev
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: MicroserviceCdiDevExcludedFields }, transaction)
  }
}

const instance = new MicroserviceCdiDevManager()
module.exports = instance
