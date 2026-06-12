const BaseManager = require('./base-manager')
const models = require('../models')
const FogLogStatus = models.FogLogStatus

const fogLogStatusExcludedFields = [
  'id',
  'iofog_uuid',
  'iofogUuid',
  'created_at',
  'updated_at'
]

class FogLogStatusManager extends BaseManager {
  getEntity () {
    return FogLogStatus
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: fogLogStatusExcludedFields }, transaction)
  }
}

const instance = new FogLogStatusManager()
module.exports = instance
