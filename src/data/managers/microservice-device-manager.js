const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceDevice = models.MicroserviceDevice

const excludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid'
]

class MicroserviceDeviceManager extends BaseManager {
  getEntity () {
    return MicroserviceDevice
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: excludedFields }, transaction)
  }
}

const instance = new MicroserviceDeviceManager()
module.exports = instance
