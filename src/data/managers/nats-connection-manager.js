const BaseManager = require('./base-manager')
const models = require('../models')
const NatsConnection = models.NatsConnection
const NatsInstance = models.NatsInstance

class NatsConnectionManager extends BaseManager {
  getEntity () {
    return NatsConnection
  }

  findAllWithNats (where, transaction) {
    return NatsConnection.findAll({
      include: [
        {
          model: NatsInstance,
          as: 'source',
          required: true
        },
        {
          model: NatsInstance,
          as: 'dest',
          required: true
        }
      ],
      where: where
    }, { transaction: transaction })
  }
}

module.exports = new NatsConnectionManager()
