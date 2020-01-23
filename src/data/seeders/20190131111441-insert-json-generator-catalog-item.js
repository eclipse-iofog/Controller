const constants = require('../constants')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CatalogItems', [
      {
        id: constants.JSON_GEN_CATALOG_ITEM_ID,
        name: 'JSON Generator',
        description: 'Container generates ioMessages with contentdata as complex JSON object.',
        category: 'UTILITIES',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: '{}',
        is_public: true,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      }]
    ).then(() => {
      return queryInterface.bulkInsert('CatalogItemImages', [
        {
          catalog_item_id: constants.JSON_GEN_CATALOG_ITEM_ID,
          fog_type_id: constants.FOG_TYPE_X86,
          container_image: 'iofog/json-generator'
        },
        {
          catalog_item_id: constants.JSON_GEN_CATALOG_ITEM_ID,
          fog_type_id: constants.FOG_TYPE_ARM,
          container_image: 'iofog/json-generator-arm'
        }
      ])
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CatalogItems', { ID: constants.JSON_GEN_CATALOG_ITEM_ID }, {}).then(() => {
      return queryInterface.bulkDelete('CatalogItemImages', { catalog_item_id: constants.JSON_GEN_CATALOG_ITEM_ID })
    })
  }
}
