const BaseManager = require('./base-manager')
const models = require('../models')
const HWInfo = models.HWInfo

class HWInfoManager extends BaseManager {
  getEntity () {
    return HWInfo
  }
}

const instance = new HWInfoManager()
module.exports = instance
