const BaseManager = require('./base-manager')
const models = require('../models')
const FogVersionCommand = models.FogVersionCommand

class FogVersionCommandManager extends BaseManager {
  getEntity () {
    return FogVersionCommand
  }
}

const instance = new FogVersionCommandManager()
module.exports = instance
