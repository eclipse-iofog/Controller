'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CatalogItemImages', [
      {
        id: 1,
        catalog_item_id: 1,
        fog_type_id: 1,
        container_image: 'iofog/core-networking',
      },
      {
        id: 2,
        catalog_item_id: 1,
        fog_type_id: 2,
        container_image: 'iofog/core-networking-arm',
      },
      {
        id: 3,
        catalog_item_id: 2,
        fog_type_id: 1,
        container_image: 'iofog/restblue',
      },
      {
        id: 4,
        catalog_item_id: 2,
        fog_type_id: 2,
        container_image: 'iofog/restblue-arm',
      },
      {
        id: 5,
        catalog_item_id: 3,
        fog_type_id: 1,
        container_image: 'iofog/hal',
      },
      {
        id: 6,
        catalog_item_id: 3,
        fog_type_id: 2,
        container_image: 'iofog/hal-arm',
      },
      {
        id: 7,
        catalog_item_id: 4,
        fog_type_id: 1,
        container_image: 'iofog/diagnostics',
      },
      {
        id: 8,
        catalog_item_id: 4,
        fog_type_id: 2,
        container_image: 'iofog/diagnostics-arm',
      },
      {
        id: 9,
        catalog_item_id: 5,
        fog_type_id: 1,
        container_image: 'iofog/hello-web',
      },
      {
        id: 10,
        catalog_item_id: 5,
        fog_type_id: 2,
        container_image: 'iofog/hello-web-arm',
      },
      {
        id: 11,
        catalog_item_id: 6,
        fog_type_id: 1,
        container_image: 'iofog/open-weather-map',
      },
      {
        id: 12,
        catalog_item_id: 6,
        fog_type_id: 2,
        container_image: 'iofog/open-weather-map-arm',
      },
      {
        id: 13,
        catalog_item_id: 7,
        fog_type_id: 1,
        container_image: 'iofog/json-rest-api',
      },
      {
        id: 14,
        catalog_item_id: 7,
        fog_type_id: 2,
        container_image: 'iofog/json-rest-api-arm',
      },
      {
        id: 15,
        catalog_item_id: 8,
        fog_type_id: 1,
        container_image: 'iofog/temperature-conversion',
      },
      {
        id: 16,
        catalog_item_id: 8,
        fog_type_id: 2,
        container_image: 'iofog/temperature-conversion-arm',
      },
      {
        id: 17,
        catalog_item_id: 9,
        fog_type_id: 1,
        container_image: 'iofog/json-subselect',
      },
      {
        id: 18,
        catalog_item_id: 9,
        fog_type_id: 2,
        container_image: 'iofog/json-subselect-arm',
      },
      {
        id: 19,
        catalog_item_id: 10,
        fog_type_id: 1,
        container_image: 'iofog/humidity-sensor-simulator',
      },
      {
        id: 20,
        catalog_item_id: 10,
        fog_type_id: 2,
        container_image: 'iofog/humidity-sensor-simulator-arm',
      },
      {
        id: 21,
        catalog_item_id: 11,
        fog_type_id: 1,
        container_image: 'iofog/seismic-sensor-simulator',
      },
      {
        id: 22,
        catalog_item_id: 11,
        fog_type_id: 2,
        container_image: 'iofog/seismic-sensor-simulator-arm',
      },
      {
        id: 23,
        catalog_item_id: 12,
        fog_type_id: 1,
        container_image: 'iofog/temperature-sensor-simulator',
      },
      {
        id: 24,
        catalog_item_id: 12,
        fog_type_id: 2,
        container_image: 'iofog/temperature-sensor-simulator-arm',
      },
    ])
  },


  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CatalogItemImages', null, {})
  },
}
