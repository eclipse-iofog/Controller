const BaseManager = require('./base-manager');
const models = require('./../models');
const Flow = models.Flow;

class FlowManager extends BaseManager {
    getEntity() {
        return Flow;
    }
}

const instance = new FlowManager();
module.exports = instance;