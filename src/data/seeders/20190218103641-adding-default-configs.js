'use strict'

const constants = require('../constants')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkUpdate('CatalogItems',
      {
        config_example: '{"citycode":"5391997","apikey":"6141811a6136148a00133488eadff0fb","frequency":1000}'
      },
      {
        id: constants.WEATHER_CATALOG_ITEM_ID
      }
    ).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
        {
          config_example: '{"buffersize":3,"contentdataencoding":"utf8","contextdataencoding":"utf8",' +
            'outputfields":{"publisher":"source","contentdata":"temperature","timestamp":"time"}}'
        },
        {
          id: constants.JSON_REST_CATALOG_ITEM_ID
        }
      )
    }).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
        {
          config_example: '{}'
        },
        {
          id: constants.JSON_SUB_CATALOG_ITEM_ID
        }
      )
    }).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
        {
          is_public: true
        },
        {
          id: constants.COMM_LOG_CATALOG_ITEM_ID
        }
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkUpdate('CatalogItems',
      {
        config_example: '{}'
      },
      {
        id: constants.WEATHER_CATALOG_ITEM_ID
      }
    ).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
        {
          config_example: '{}'
        },
        {
          id: constants.JSON_REST_CATALOG_ITEM_ID
        }
      )
    }).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
        {
          config_example: '{}'
        },
        {
          id: constants.JSON_SUB_CATALOG_ITEM_ID
        }
      )
    }).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
        {
          is_public: false
        },
        {
          id: constants.COMM_LOG_CATALOG_ITEM_ID
        }
      )
    })
  }
}
