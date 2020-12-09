'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('MicroserviceStatuses', 'error_message', {
      type: Sequelize.TEXT,
      defaultValue: ''
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('MicroserviceStatuses', 'error_message')
  }
}
