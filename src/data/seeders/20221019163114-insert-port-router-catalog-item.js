const constants = require('../constants')
const CatalogItemManager = require('../managers/catalog-item-manager')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('CatalogItems', [
      {
        name: constants.PORT_ROUTER_CATALOG_NAME,
        description: 'The built-in port-router for Eclipse ioFog.',
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

    const portRouter = await CatalogItemManager.findOne({ name: constants.PORT_ROUTER_CATALOG_NAME, isPublic: false }, transaction)

    if (!portRouter) {
      throw new Error('Unable to update the database. Could not find port-router catalog item')
    }

    await queryInterface.bulkInsert('CatalogItemImages', [
      {
        catalog_item_id: portRouter.id,
        fog_type_id: 1,
        container_image: 'iofog/port-router:latest'
      },
      {
        catalog_item_id: portRouter.id,
        fog_type_id: 2,
        container_image: 'iofog/port-router:latest'
      }])
  },

  down: async (queryInterface, Sequelize) => {
    // const sequelize = queryInterface.sequelize

    // const transaction = await sequelize.transaction()
    const transaction = { fakeTransaction: true }

    const portRouter = await CatalogItemManager.findOne({ name: constants.PORT_ROUTER_CATALOG_NAME, isPublic: false }, transaction)
    if (portRouter) {
      await queryInterface.bulkDelete('CatalogItems', { id: portRouter.id }, {})
      await queryInterface.bulkDelete('CatalogItemImages', { catalog_item_id: portRouter.id })
    }
  }
}
