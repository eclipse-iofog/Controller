'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Connectors', 'healthy', {
      type: Sequelize.BOOLEAN,
      field: 'healthy',
      defaultValue: true
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Connectors', 'healthy')
  }
}
