const BaseManager = require('./base-manager')
const models = require('../models')
const NatsAccountRule = models.NatsAccountRule

class NatsAccountRuleManager extends BaseManager {
  getEntity () {
    return NatsAccountRule
  }
}

module.exports = new NatsAccountRuleManager()
