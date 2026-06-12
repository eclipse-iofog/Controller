const BaseManager = require('./base-manager')
const models = require('../models')
const CatalogItemImage = models.CatalogItemImage

class CatalogItemImageManager extends BaseManager {
  getEntity () {
    return CatalogItemImage
  }
}

const instance = new CatalogItemImageManager()
module.exports = instance
