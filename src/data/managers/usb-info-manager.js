const BaseManager = require('./base-manager')
const models = require('../models')
const USBInfo = models.USBInfo

class USBInfoManager extends BaseManager {
  getEntity () {
    return USBInfo
  }
}

const instance = new USBInfoManager()
module.exports = instance
