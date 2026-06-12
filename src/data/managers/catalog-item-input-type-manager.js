const BaseManager = require('./base-manager')
const models = require('../models')
const CatalogItemInputType = models.CatalogItemInputType

class CatalogItemInputTypeManager extends BaseManager {
  getEntity () {
    return CatalogItemInputType
  }
}

const instance = new CatalogItemInputTypeManager()
module.exports = instance
