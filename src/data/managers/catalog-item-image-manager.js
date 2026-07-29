const BaseManager = require('./base-manager')
const models = require('../models')

class CatalogItemImageManager extends BaseManager {
  getEntity () {
    return models.CatalogItemImage
  }

  async findCustomImageMicroserviceUuids (transaction) {
    const rows = await this.getEntity().findAll({
      attributes: ['microserviceUuid'],
      where: models.sequelize.literal('microservice_uuid IS NOT NULL'),
      raw: true,
      transaction
    })
    return [...new Set(rows.map((row) => row.microserviceUuid).filter(Boolean))]
  }
}

const instance = new CatalogItemImageManager()
module.exports = instance
