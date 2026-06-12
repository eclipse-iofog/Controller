const BaseManager = require('./base-manager')
const models = require('../models')
const Config = models.Config

class ConfigManager extends BaseManager {
  getEntity () {
    return Config
  }
}

const instance = new ConfigManager()
module.exports = instance
