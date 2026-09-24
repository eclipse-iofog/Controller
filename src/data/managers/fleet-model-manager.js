const BaseManager = require('./base-manager')
const models = require('../models')
const FleetModel = models.FleetModel

const modelExcludedFields = [
  'created_at',
  'updated_at'
]

class FleetModelManager extends BaseManager {
  getEntity () {
    return FleetModel
  }

  findOne (where, transaction) {
    return FleetModel.findOne({
      where,
      attributes: { exclude: modelExcludedFields },
      transaction
    })
  }

  findAll (where, transaction) {
    return FleetModel.findAll({
      where,
      attributes: { exclude: modelExcludedFields },
      transaction
    })
  }
}

const instance = new FleetModelManager()
module.exports = instance
