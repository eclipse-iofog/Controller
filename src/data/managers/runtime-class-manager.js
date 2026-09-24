const BaseManager = require('./base-manager')
const models = require('../models')
const RuntimeClass = models.RuntimeClass

class RuntimeClassManager extends BaseManager {
  getEntity () {
    return RuntimeClass
  }
}

const instance = new RuntimeClassManager()
module.exports = instance
