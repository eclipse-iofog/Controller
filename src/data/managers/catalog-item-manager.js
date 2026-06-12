const BaseManager = require('./base-manager')
const models = require('../models')
const CatalogItem = models.CatalogItem
const CatalogItemImage = models.CatalogItemImage
const CatalogItemInputType = models.CatalogItemInputType
const CatalogItemOutputType = models.CatalogItemOutputType

class CatalogItemManager extends BaseManager {
  getEntity () {
    return CatalogItem
  }

  findAllWithDependencies (where, attributes, transaction) {
    return CatalogItem.findAll({
      include: [
        {
          model: CatalogItemImage,
          as: 'images',
          required: false,
          attributes: ['containerImage', 'archId']
        },
        {
          model: CatalogItemInputType,
          as: 'inputType',
          required: false,
          attributes: ['infoType', 'infoFormat']
        },
        {
          model: CatalogItemOutputType,
          as: 'outputType',
          required: false,
          attributes: ['infoType', 'infoFormat']
        }],
      where,
      attributes
    }, { transaction })
  }

  findOneWithDependencies (where, attribures, transaction) {
    return CatalogItem.findOne({
      include: [
        {
          model: CatalogItemImage,
          as: 'images',
          required: false,
          attributes: ['containerImage', 'archId']
        },
        {
          model: CatalogItemInputType,
          as: 'inputType',
          required: false,
          attributes: ['infoType', 'infoFormat']
        },
        {
          model: CatalogItemOutputType,
          as: 'outputType',
          required: false,
          attributes: ['infoType', 'infoFormat']
        }],
      where,
      attributes: attribures
    }, { transaction })
  }
}

const instance = new CatalogItemManager()
module.exports = instance
