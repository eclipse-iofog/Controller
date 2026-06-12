const BaseManager = require('./base-manager')
const models = require('../models')
const Router = models.Router

class RouterManager extends BaseManager {
  getEntity () {
    return Router
  }
}

const instance = new RouterManager()
module.exports = instance
