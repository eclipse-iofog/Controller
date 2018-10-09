const BaseManager = require('./base-manager');
const UserManager = require('./user-manager');
const models = require('./../models');
const Flow = models.Flow;

class FlowManager extends BaseManager {
    getEntity() {
        return Flow;
    }

    async addFlow(flowData) {
        return Flow.create(flowData);
    }

    async deleteFlow(id) {
        return Flow.deleteById(id);
    }

    async updateFlow(flowData) {
        return Flow.update(flowData);
    }

    async getFlow(id) {
        return Flow.findById(id);
    }

    async getFlowsByUser(token) {
        const userId = UserManager.findByAccessToken(token).id;
        return Flow.findAll({
            where: {
                userId: userId
            }
        });
    }

    async validateFlowByName(name) {
        return Flow.find({
            where: {
                name: name
            }
        });
    }

}

const instance = new FlowManager();
module.exports = instance;