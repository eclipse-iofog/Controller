'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CatalogItems', [
      {
        name: 'Common Logging',
        description: 'Container which gathers logs and provides REST API' +
        ' for adding and querying logs from containers',
        category: 'UTILITIES',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: '{"access_tokens": ["Some_Access_Token"], "cleanfrequency": "1h40m", "ttl": "24h"}',
        is_public: false,
        registry_id: 1,
        user_id: null
      }]
    ).then(() => {
      return queryInterface.bulkInsert('CatalogItemImages', [
        {
          catalog_item_id: 13,
          fog_type_id: 1,
          container_image: 'iofog/common-logging'
        },
        {
          catalog_item_id: 13,
          fog_type_id: 2,
          container_image: 'iofog/common-logging-arm'
        }
      ]
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CatalogItems', { ID: 13 }, {}).then(() => {
      return queryInterface.bulkDelete('CatalogItemImages', { catalog_item_id: 13 })
    })
  }
}
