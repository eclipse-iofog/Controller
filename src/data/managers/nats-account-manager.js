const BaseManager = require('./base-manager')
const models = require('../models')
const NatsAccount = models.NatsAccount

class NatsAccountManager extends BaseManager {
  getEntity () {
    return NatsAccount
  }

  findByApplicationId (applicationId, transaction) {
    return NatsAccount.findOne({
      where: { applicationId },
      include: [{ model: models.Application, as: 'application' }]
    }, { transaction })
  }
}

module.exports = new NatsAccountManager()
