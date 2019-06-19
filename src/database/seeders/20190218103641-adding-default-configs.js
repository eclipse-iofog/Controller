'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkUpdate('CatalogItems',
        {
          config_example: '{"citycode":"5391997","apikey":"6141811a6136148a00133488eadff0fb","frequency":1000}',
        },
        {
          name: 'Open Weather Map Data',
        },
    ).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
          {
            config_example: '{"buffersize":3,"contentdataencoding":"utf8","contextdataencoding":"utf8",' +
            'outputfields":{"publisher":"source","contentdata":"temperature","timestamp":"time"}}',
          },
          {
            name: 'JSON REST API',
          },
      )
    }).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
          {
            config_example: '{}',
          },
          {
            name: 'JSON Sub-Select',
          },
      )
    }).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
          {
            is_public: true,
          },
          {
            name: 'Common Logging',
          },
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkUpdate('CatalogItems',
        {
          config_example: '{}',
        },
        {
          name: 'Open Weather Map Data',
        },
    ).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
          {
            config_example: '{}',
          },
          {
            name: 'JSON REST API',
          },
      )
    }).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
          {
            config_example: '{}',
          },
          {
            name: 'JSON Sub-Select',
          },
      )
    }).then(() => {
      return queryInterface.bulkUpdate('CatalogItems',
          {
            is_public: false,
          },
          {
            name: 'Common Logging',
          },
      )
    })
  },
}
