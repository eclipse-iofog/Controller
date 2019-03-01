'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CatalogItems', [
      {
        ID: 100,
        name: 'Common Logging',
        description: 'Container which gathers logs and provides REST API' +
        ' for adding and querying logs from containers',
        category: 'UTILITIES',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: '{"access_tokens": ["Some_Access_Token"], "cleanfrequency": "1h40m", "ttl": "24h"}',
        is_public: 0,
        registry_id: 1,
        user_id: null,
      }]
    ).then(() => {
      return queryInterface.bulkInsert('CatalogItemImages', [
        {
          ID: 101,
          catalog_item_id: 100,
          fog_type_id: 1,
          container_image: 'iofog/common-logging',
        },
        {
          ID: 102,
          catalog_item_id: 100,
          fog_type_id: 2,
          container_image: 'iofog/common-logging-arm',
        },
      ]
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CatalogItems', {ID: 100}, {}).then(() => {
      return queryInterface.bulkDelete('CatalogItemImages', {catalog_item_id: 100})
    })
  },
}
