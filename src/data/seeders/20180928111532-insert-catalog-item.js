'use strict'

const constants = require('../constants')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CatalogItems', [
      {
        id: constants.ROUTER_CATALOG_ITEM_ID,
        name: 'Router',
        description: 'The built-in router for Eclipse ioFog.',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: null,
        is_public: false,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.PROXY_CATALOG_ITEM_ID,
        name: 'Proxy',
        description: 'The built-in proxy for Eclipse ioFog.',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: null,
        is_public: false,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.RESTBLUE_CATALOG_ITEM_ID,
        name: 'RESTBlue',
        description: 'REST API for Bluetooth Low Energy layer.',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: null,
        is_public: false,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.HAL_CATALOG_ITEM_ID,
        name: 'HAL',
        description: 'REST API for Hardware Abstraction layer.',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'none.png',
        config_example: null,
        is_public: false,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.DIAGNOSTICS_CATALOG_ITEM_ID,
        name: 'Diagnostics',
        description: '0',
        category: 'UTILITIES',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'images/build/580.png',
        config_example: null,
        is_public: true,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.HELLO_WEB_CATALOG_ITEM_ID,
        name: 'Hello Web Demo',
        description: 'A simple web server to test Eclipse ioFog.',
        category: 'UTILITIES',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'images/build/4.png',
        config_example: null,
        is_public: true,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.WEATHER_CATALOG_ITEM_ID,
        name: 'Open Weather Map Data',
        description: 'A stream of data from the Open Weather Map API in JSON format',
        category: 'SENSORS',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'images/build/8.png',
        config_example: null,
        is_public: true,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.JSON_REST_CATALOG_ITEM_ID,
        name: 'JSON REST API',
        description: 'A configurable REST API that gives JSON output',
        category: 'UTILITIES',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'images/build/49.png',
        config_example: null,
        is_public: true,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.TEMP_CONV_CATALOG_ITEM_ID,
        name: 'Temperature Converter',
        description: 'A simple temperature format converter',
        category: 'UTILITIES',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'images/build/58.png',
        config_example: null,
        is_public: true,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.JSON_SUB_CATALOG_ITEM_ID,
        name: 'JSON Sub-Select',
        description: 'Performs sub-selection and transform operations on any JSON messages',
        category: 'UTILITIES',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'images/build/59.png',
        config_example: null,
        is_public: true,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.HUM_SENS_CATALOG_ITEM_ID,
        name: 'Humidity Sensor Simulator',
        description: 'Humidity Sensor Simulator for Eclipse ioFog',
        category: 'SIMULATOR',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'images/build/simulator.png',
        config_example: null,
        is_public: true,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.SEISMIC_SENS_CATALOG_ITEM_ID,
        name: 'Seismic Sensor Simulator',
        description: 'Seismic Sensor Simulator for Eclipse ioFog',
        category: 'SIMULATOR',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'images/build/simulator.png',
        config_example: null,
        is_public: true,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      },
      {
        id: constants.TEMP_SENS_CATALOG_ITEM_ID,
        name: 'Temperature Sensor Simulator',
        description: 'Temperature Sensor Simulator for Eclipse ioFog',
        category: 'SIMULATOR',
        publisher: 'Eclipse ioFog',
        disk_required: 0,
        ram_required: 0,
        picture: 'images/build/simulator.png',
        config_example: null,
        is_public: true,
        registry_id: constants.DOCKER_REGISTRY_ID,
        user_id: null
      }
    ])
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CatalogItems', null, {})
  }
}
