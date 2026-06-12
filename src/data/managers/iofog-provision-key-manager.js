const BaseManager = require('./base-manager')
const models = require('../models')
const FogProvisionKey = models.FogProvisionKey

class FogProvisionKeyManager extends BaseManager {
  getEntity () {
    return FogProvisionKey
  }
}

const instance = new FogProvisionKeyManager()
module.exports = instance
