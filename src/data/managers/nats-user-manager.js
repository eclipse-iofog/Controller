const BaseManager = require('./base-manager')
const models = require('../models')
const NatsUser = models.NatsUser

class NatsUserManager extends BaseManager {
  getEntity () {
    return NatsUser
  }

  findByMicroserviceUuid (microserviceUuid, transaction) {
    return NatsUser.findOne({
      where: { microserviceUuid },
      include: [{ model: models.NatsAccount, as: 'account' }]
    }, { transaction })
  }

  findAllWithAccountAndApplication (transaction) {
    return NatsUser.findAll({
      include: [
        {
          model: models.NatsAccount,
          as: 'account',
          include: [{ model: models.Application, as: 'application' }]
        }
      ]
    }, { transaction })
  }
}

module.exports = new NatsUserManager()
