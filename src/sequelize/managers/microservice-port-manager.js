const BaseManager = require('./base-manager');
const models = require('./../models');
const MicroservicePort = models.MicroservicePort;

class MicroservicePortManager extends BaseManager {
  getEntity() {
    return MicroservicePort
  }
}

const instance = new MicroservicePortManager();
module.exports = instance;