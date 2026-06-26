const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceExecSession = models.MicroserviceExecSession

class MicroserviceExecSessionManager extends BaseManager {
  getEntity () {
    return MicroserviceExecSession
  }

  findBySessionId (sessionId, transaction) {
    return this.findOne({ sessionId }, transaction)
  }

  deleteBySessionId (sessionId, transaction) {
    return this.delete({ sessionId }, transaction)
  }
}

const instance = new MicroserviceExecSessionManager()
module.exports = instance
