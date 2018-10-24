const BaseManager = require('./base-manager');
const models = require('./../models');
const Routing = models.Routing;

class RoutingManager extends BaseManager {
    getEntity() {
        return Routing;
    }
}

const instance = new RoutingManager();
module.exports = instance;