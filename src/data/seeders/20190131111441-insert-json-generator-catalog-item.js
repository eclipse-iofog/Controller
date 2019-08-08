module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CatalogItems', [
      {
        name: 'JSON Generator',
        description: 'Container generates ioMessages with contentdata as complex JSON object.',
        category: 'UTILITIES',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: '{}',
        is_public: true,
        registry_id: 1,
        user_id: null
      }]
    ).then(() => {
      return queryInterface.bulkInsert('CatalogItemImages', [
        {
          catalog_item_id: 14,
          fog_type_id: 1,
          container_image: 'iofog/json-generator'
        },
        {
          catalog_item_id: 14,
          fog_type_id: 2,
          container_image: 'iofog/json-generator-arm'
        }
      ])
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CatalogItems', { ID: 14 }, {}).then(() => {
      return queryInterface.bulkDelete('CatalogItemImages', { catalog_item_id: 14 })
    })
  }
}
