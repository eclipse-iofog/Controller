const constants = require('../constants')
const CatalogItemManager = require('../managers/catalog-item-manager')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = { fakeTransaction: true }

    const router = await CatalogItemManager.findOne({ name: constants.ROUTER_CATALOG_NAME, isPublic: false }, transaction)

    if (!router) {
      throw new Error('Unable to update the database. Could not find router catalog item')
    }

    await queryInterface.bulkUpdate('CatalogItemImages',
      {
        container_image: 'iofog/router:latest'
      },
      {
        catalog_item_id: router.id,
        fog_type_id: 1
      })
    await queryInterface.bulkUpdate('CatalogItemImages',
      {
        container_image: 'iofog/router-arm:latest'
      },
      {
        catalog_item_id: router.id,
        fog_type_id: 2
      })
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = { fakeTransaction: true }

    const router = await CatalogItemManager.findOne({ name: constants.ROUTER_CATALOG_NAME, isPublic: false }, transaction)

    if (!router) {
      throw new Error('Unable to update the database. Could not find router catalog item')
    }

    await queryInterface.bulkUpdate('CatalogItemImages',
      {
        container_image: 'quay.io/interconnectedcloud/qdrouterd:latest'
      },
      {
        catalog_item_id: router.id,
        fog_type_id: 1
      })
    await queryInterface.bulkUpdate('CatalogItemImages',
      {
        container_image: 'iofog/qdrouterd-arm:latest'
      },
      {
        catalog_item_id: router.id,
        fog_type_id: 2
      })
  }
}
