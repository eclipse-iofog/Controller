const BaseManager = require('./base-manager')
const models = require('../models')
const VolumeMount = models.VolumeMount

const volumeMountExcludedFields = [
  'created_at',
  'updated_at'
]

class VolumeMountingManager extends BaseManager {
  getEntity () {
    return VolumeMount
  }

  getAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: volumeMountExcludedFields }, transaction)
  }

  getAll (where, transaction) {
    return VolumeMount.findAll({
      where,
      attributes: ['uuid', 'name', 'configMapName', 'secretName']
    }, { transaction })
  }

  getOne (where, transaction) {
    return VolumeMount.findOne({
      where,
      attributes: ['uuid', 'name', 'configMapName', 'secretName', 'version']
    }, { transaction })
  }

  findOne (where, transaction) {
    return VolumeMount.findOne({
      where,
      attributes: ['uuid', 'name', 'configMapName', 'secretName', 'version']
    }, { transaction })
  }

  findAll (where, transaction) {
    return VolumeMount.findAll({
      where,
      attributes: ['uuid', 'name', 'configMapName', 'secretName', 'version']
    }, { transaction })
  }
}

const instance = new VolumeMountingManager()
module.exports = instance
