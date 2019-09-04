'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('CatalogItemImages', 'microservice_uuid', {
      type: Sequelize.STRING(32),
      field: 'microservice_uuid',
      references: { model: 'Microservices', key: 'uuid' },
      onDelete: 'cascade'
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('CatalogItemImages', 'microservice_uuid')
  }
}
