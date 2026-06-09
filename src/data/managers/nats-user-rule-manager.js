const BaseManager = require('./base-manager')
const models = require('../models')
const NatsUserRule = models.NatsUserRule

class NatsUserRuleManager extends BaseManager {
  getEntity () {
    return NatsUserRule
  }
}

module.exports = new NatsUserRuleManager()
