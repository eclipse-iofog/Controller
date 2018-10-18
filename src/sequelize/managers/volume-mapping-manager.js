const BaseManager = require('./base-manager');
const models = require('./../models');
const VolumeMapping = models.VolumeMapping;

class VolumeMappingManager extends BaseManager {
    getEntity() {
        return VolumeMapping
    }
}

const instance = new VolumeMappingManager();
module.exports = instance;