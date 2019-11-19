'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('Microservices', 'updated_by', 'user_id')
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('Microservices', 'user_id', 'updated_by')
  }
}
