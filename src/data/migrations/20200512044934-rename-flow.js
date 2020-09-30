'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('Microservices', 'flow_id', 'application_id')
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('Microservices', 'application_id', 'flow_id')
  }
}
