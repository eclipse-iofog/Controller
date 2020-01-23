'use strict'

const constants = require('../constants')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CatalogItems', [
      {
        id: constants.COMM_LOG_CATALOG_ITEM_ID,
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
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      }]
    ).then(() => {
      return queryInterface.bulkInsert('CatalogItemImages', [
        {
          catalog_item_id: constants.COMM_LOG_CATALOG_ITEM_ID,
          fog_type_id: constants.FOG_TYPE_X86,
          container_image: 'iofog/common-logging'
        },
        {
          catalog_item_id: constants.COMM_LOG_CATALOG_ITEM_ID,
          fog_type_id: constants.FOG_TYPE_ARM,
          container_image: 'iofog/common-logging-arm'
        }
      ]
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CatalogItems', { ID: constants.COMM_LOG_CATALOG_ITEM_ID }, {}).then(() => {
      return queryInterface.bulkDelete('CatalogItemImages', { catalog_item_id: constants.COMM_LOG_CATALOG_ITEM_ID })
    })
  }
}
