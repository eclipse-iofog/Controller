const constants = require('../constants')
const CatalogItemManager = require('../managers/catalog-item-manager')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('CatalogItems', [
      {
        name: constants.ROUTER_CATALOG_NAME,
        description: 'The built-in router for Eclipse ioFog.',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: null,
        is_public: false,
        registry_id: 1,
        user_id: null
      },
      {
        name: constants.PROXY_CATALOG_NAME,
        description: 'The built-in proxy for Eclipse ioFog.',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: null,
        is_public: false,
        registry_id: 1,
        user_id: null
      }]
    )

    // const sequelize = queryInterface.sequelize
    // const transaction = await sequelize.transaction()
    const transaction = { fakeTransaction: true }

    const router = await CatalogItemManager.findOne({ name: constants.ROUTER_CATALOG_NAME, isPublic: false }, transaction)
    const proxy = await CatalogItemManager.findOne({ name: constants.PROXY_CATALOG_NAME, isPublic: false }, transaction)

    if (!router || !proxy) {
      throw new Error('Unable to update the database. Could not find proxy or router catalog item')
    }

    await queryInterface.bulkInsert('CatalogItemImages', [
      {
        catalog_item_id: router.id,
        fog_type_id: 1,
        container_image: 'quay.io/interconnectedcloud/qdrouterd:latest'
      },
      {
        catalog_item_id: router.id,
        fog_type_id: 2,
        container_image: 'iofog/qdrouterd-arm:latest'
      },
      {
        catalog_item_id: proxy.id,
        fog_type_id: 1,
        container_image: 'iofog/proxy:latest'
      },
      {
        catalog_item_id: proxy.id,
        fog_type_id: 2,
        container_image: 'iofog/proxy-arm:latest'
      }])
  },

  down: async (queryInterface, Sequelize) => {
    // const sequelize = queryInterface.sequelize

    // const transaction = await sequelize.transaction()
    const transaction = { fakeTransaction: true }

    const router = await CatalogItemManager.findOne({ name: constants.ROUTER_CATALOG_NAME, isPublic: false }, transaction)
    const proxy = await CatalogItemManager.findOne({ name: constants.PROXY_CATALOG_NAME, isPublic: false }, transaction)
    if (router) {
      await queryInterface.bulkDelete('CatalogItems', { id: router.id }, {})
      await queryInterface.bulkDelete('CatalogItemImages', { catalog_item_id: router.id })
    }

    if (proxy) {
      await queryInterface.bulkDelete('CatalogItems', { id: proxy.id }, {})
      await queryInterface.bulkDelete('CatalogItemImages', { catalog_item_id: proxy.id })
    }
  }
}
