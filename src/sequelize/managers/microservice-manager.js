const BaseManager = require('./base-manager');
const models = require('./../models');
const Microservice = models.Microservice;

class MicroserviceManager extends BaseManager {
    getEntity() {
        return Microservice
    }
}

const instance = new MicroserviceManager();
module.exports = instance;