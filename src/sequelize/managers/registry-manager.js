const BaseManager = require('./base-manager');
const models = require('./../models');
const Registry = models.Registry;

class RegistryManager extends BaseManager {
  getEntity() {
    return Registry;
  }
}

const instance = new RegistryManager();
module.exports = instance;