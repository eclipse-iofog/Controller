'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CatalogItemImages', [
      {
        catalog_item_id: 1,
        fog_type_id: 1,
        container_image: 'iofog/core-networking'
      },
      {
        catalog_item_id: 1,
        fog_type_id: 2,
        container_image: 'iofog/core-networking-arm'
      },
      {
        catalog_item_id: 2,
        fog_type_id: 1,
        container_image: 'iofog/restblue'
      },
      {
        catalog_item_id: 2,
        fog_type_id: 2,
        container_image: 'iofog/restblue-arm'
      },
      {
        catalog_item_id: 3,
        fog_type_id: 1,
        container_image: 'iofog/hal'
      },
      {
        catalog_item_id: 3,
        fog_type_id: 2,
        container_image: 'iofog/hal-arm'
      },
      {
        catalog_item_id: 4,
        fog_type_id: 1,
        container_image: 'iofog/diagnostics'
      },
      {
        catalog_item_id: 4,
        fog_type_id: 2,
        container_image: 'iofog/diagnostics-arm'
      },
      {
        catalog_item_id: 5,
        fog_type_id: 1,
        container_image: 'iofog/hello-web'
      },
      {
        catalog_item_id: 5,
        fog_type_id: 2,
        container_image: 'iofog/hello-web-arm'
      },
      {
        catalog_item_id: 6,
        fog_type_id: 1,
        container_image: 'iofog/open-weather-map'
      },
      {
        catalog_item_id: 6,
        fog_type_id: 2,
        container_image: 'iofog/open-weather-map-arm'
      },
      {
        catalog_item_id: 7,
        fog_type_id: 1,
        container_image: 'iofog/json-rest-api'
      },
      {
        catalog_item_id: 7,
        fog_type_id: 2,
        container_image: 'iofog/json-rest-api-arm'
      },
      {
        catalog_item_id: 8,
        fog_type_id: 1,
        container_image: 'iofog/temperature-conversion'
      },
      {
        catalog_item_id: 8,
        fog_type_id: 2,
        container_image: 'iofog/temperature-conversion-arm'
      },
      {
        catalog_item_id: 9,
        fog_type_id: 1,
        container_image: 'iofog/json-subselect'
      },
      {
        catalog_item_id: 9,
        fog_type_id: 2,
        container_image: 'iofog/json-subselect-arm'
      },
      {
        catalog_item_id: 10,
        fog_type_id: 1,
        container_image: 'iofog/humidity-sensor-simulator'
      },
      {
        catalog_item_id: 10,
        fog_type_id: 2,
        container_image: 'iofog/humidity-sensor-simulator-arm'
      },
      {
        catalog_item_id: 11,
        fog_type_id: 1,
        container_image: 'iofog/seismic-sensor-simulator'
      },
      {
        catalog_item_id: 11,
        fog_type_id: 2,
        container_image: 'iofog/seismic-sensor-simulator-arm'
      },
      {
        catalog_item_id: 12,
        fog_type_id: 1,
        container_image: 'iofog/temperature-sensor-simulator'
      },
      {
        catalog_item_id: 12,
        fog_type_id: 2,
        container_image: 'iofog/temperature-sensor-simulator-arm'
      }
    ])
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CatalogItemImages', null, {})
  }
}
