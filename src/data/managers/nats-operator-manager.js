const BaseManager = require('./base-manager')
const models = require('../models')
const NatsOperator = models.NatsOperator

class NatsOperatorManager extends BaseManager {
  getEntity () {
    return NatsOperator
  }
}

module.exports = new NatsOperatorManager()
