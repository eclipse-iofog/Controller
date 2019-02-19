module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CatalogItems', [
      {
        ID: 101,
        name: 'JSON Generator',
        description: 'Container generates ioMessages with contentdata as complex JSON object.',
        category: 'UTILITIES',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: '{}',
        is_public: 1,
        registry_id: 1,
        user_id: null
      }]
    ).then(() => {
      return queryInterface.bulkInsert('CatalogItemImages', [
          {
            ID: 103,
            catalog_item_id: 101,
            fog_type_id: 1,
            container_image: 'iofog/json-generator'
          },
          {
            ID: 104,
            catalog_item_id: 101,
            fog_type_id: 2,
            container_image: 'iofog/json-generator-arm'
          }
        ]
      )
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CatalogItems', {ID: 101}, {}).then(() => {
      return queryInterface.bulkDelete('CatalogItemImages', {catalog_item_id: 101})
    });
  }
};