const constants = require('../constants')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize

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

    const router = await sequelize.query('SELECT id FROM CatalogItems WHERE is_public = 0 AND name = "Router"', { type: sequelize.QueryTypes.SELECT })
    const proxy = await sequelize.query('SELECT id FROM CatalogItems WHERE is_public = 0 AND name = "Proxy"', { type: sequelize.QueryTypes.SELECT })
    if (!router || !proxy || router.length !== 1 || proxy.length !== 1) {
      throw new Error('Unable to update the database')
    }

    await queryInterface.bulkInsert('CatalogItemImages', [
      {
        catalog_item_id: router[0].id,
        fog_type_id: 1,
        container_image: 'quay.io/interconnectedcloud/qdrouterd:latest'
      },
      {
        catalog_item_id: router[0].id,
        fog_type_id: 2,
        container_image: 'iofog/qdrouterd-arm:latest'
      },
      {
        catalog_item_id: proxy[0].id,
        fog_type_id: 1,
        container_image: 'iofog/proxy:latest'
      },
      {
        catalog_item_id: proxy[0].id,
        fog_type_id: 2,
        container_image: 'iofog/proxy-arm:latest'
      }])
  },

  down: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize

    const router = await sequelize.query('SELECT id FROM CatalogItems WHERE is_public = 0 AND name = "Router"', { type: sequelize.QueryTypes.SELECT })
    if (router && router.length > 0) {
      await queryInterface.bulkDelete('CatalogItems', { id: router[0].id }, {})
      await queryInterface.bulkDelete('CatalogItemImages', { catalog_item_id: router[0].id })
    }

    const proxy = await sequelize.query('SELECT id FROM CatalogItems WHERE is_public = 0 AND name = "Proxy"', { type: sequelize.QueryTypes.SELECT })
    if (proxy && proxy.length > 0) {
      await queryInterface.bulkDelete('CatalogItems', { id: proxy[0].id }, {})
      await queryInterface.bulkDelete('CatalogItemImages', { catalog_item_id: proxy[0].id })
    }
  }
}
