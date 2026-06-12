const BaseManager = require('./base-manager')
const models = require('../models')
const RouterConnection = models.RouterConnection
const Router = models.Router

class RouterConnectionManager extends BaseManager {
  getEntity () {
    return RouterConnection
  }

  findAllWithRouters (where, transaction) {
    return RouterConnection.findAll({
      include: [
        {
          model: Router,
          as: 'source',
          required: true
        },
        {
          model: Router,
          as: 'dest',
          required: true
        }
      ],
      where
    }, { transaction })
  }
}

const instance = new RouterConnectionManager()
module.exports = instance
