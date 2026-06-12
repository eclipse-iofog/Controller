const BaseManager = require('./base-manager')
const models = require('../models')
const Architecture = models.Architecture

class ArchitectureManager extends BaseManager {
  getEntity () {
    return Architecture
  }
}

const instance = new ArchitectureManager()
module.exports = instance
