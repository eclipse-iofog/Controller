const BaseManager = require('./base-manager')
const models = require('../models')
const ChangeTracking = models.ChangeTracking

class ChangeTrackingManager extends BaseManager {
  getEntity () {
    return ChangeTracking
  }
}

const instance = new ChangeTrackingManager()
module.exports = instance
