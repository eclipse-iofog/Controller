const BaseManager = require('./base-manager')
const models = require('../models')
const NatsInstance = models.NatsInstance

class NatsInstanceManager extends BaseManager {
  getEntity () {
    return NatsInstance
  }

  findByFog (iofogUuid, transaction) {
    return NatsInstance.findOne({ where: { iofogUuid } }, { transaction })
  }
}

module.exports = new NatsInstanceManager()
