const BaseManager = require('./base-manager')
const models = require('../models')
const VolumeMapping = models.VolumeMapping

class VolumeMappingManager extends BaseManager {
  getEntity () {
    return VolumeMapping
  }

  findAll (where, transaction) {
    return VolumeMapping.findAll({
      where,
      attributes: ['hostDestination', 'containerDestination', 'accessMode', 'id', 'type'],
      transaction
    })
  }
}

const instance = new VolumeMappingManager()
module.exports = instance
