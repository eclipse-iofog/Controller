const BaseManager = require('./base-manager')
const models = require('../models')
const CatalogItemOutputType = models.CatalogItemOutputType

class CatalogItemOutputTypeManager extends BaseManager {
  getEntity () {
    return CatalogItemOutputType
  }
}

const instance = new CatalogItemOutputTypeManager()
module.exports = instance
