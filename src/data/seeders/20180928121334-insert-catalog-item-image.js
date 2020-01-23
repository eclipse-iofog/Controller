'use strict'

const constants = require('../constants')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CatalogItemImages', [
      {
        catalog_item_id: constants.ROUTER_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'quay.io/interconnectedcloud/qdrouterd:latest'
      },
      {
        catalog_item_id: constants.ROUTER_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/qdrouterd-arm:latest'
      },
      {
        catalog_item_id: constants.PROXY_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: '' // TODO
      },
      {
        catalog_item_id: constants.PROXY_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: '' // TODO
      },
      {
        catalog_item_id: constants.RESTBLUE_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/restblue'
      },
      {
        catalog_item_id: constants.RESTBLUE_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/restblue-arm'
      },
      {
        catalog_item_id: constants.HAL_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/hal'
      },
      {
        catalog_item_id: constants.HAL_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/hal-arm'
      },
      {
        catalog_item_id: constants.DIAGNOSTICS_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/diagnostics'
      },
      {
        catalog_item_id: constants.DIAGNOSTICS_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/diagnostics-arm'
      },
      {
        catalog_item_id: constants.HELLO_WEB_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/hello-web'
      },
      {
        catalog_item_id: constants.HELLO_WEB_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/hello-web-arm'
      },
      {
        catalog_item_id: constants.WEATHER_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/open-weather-map'
      },
      {
        catalog_item_id: constants.WEATHER_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/open-weather-map-arm'
      },
      {
        catalog_item_id: constants.JSON_REST_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/json-rest-api'
      },
      {
        catalog_item_id: constants.JSON_REST_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/json-rest-api-arm'
      },
      {
        catalog_item_id: constants.TEMP_CONV_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/temperature-conversion'
      },
      {
        catalog_item_id: constants.TEMP_CONV_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/temperature-conversion-arm'
      },
      {
        catalog_item_id: constants.JSON_SUB_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/json-subselect'
      },
      {
        catalog_item_id: constants.JSON_SUB_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/json-subselect-arm'
      },
      {
        catalog_item_id: constants.HUM_SENS_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/humidity-sensor-simulator'
      },
      {
        catalog_item_id: constants.HUM_SENS_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/humidity-sensor-simulator-arm'
      },
      {
        catalog_item_id: constants.SEISMIC_SENS_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/seismic-sensor-simulator'
      },
      {
        catalog_item_id: constants.SEISMIC_SENS_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/seismic-sensor-simulator-arm'
      },
      {
        catalog_item_id: constants.TEMP_SENS_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_X86,
        container_image: 'iofog/temperature-sensor-simulator'
      },
      {
        catalog_item_id: constants.TEMP_SENS_CATALOG_ITEM_ID,
        fog_type_id: constants.FOG_TYPE_ARM,
        container_image: 'iofog/temperature-sensor-simulator-arm'
      }
    ])
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CatalogItemImages', null, {})
  }
}
