const BaseManager = require('./base-manager')
const models = require('./../models')
const Tunnel = models.Tunnel

class TunnelManager extends BaseManager {
  getEntity () {
    return Tunnel
  }
}

const instance = new TunnelManager()
module.exports = instance
