'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Routings', 'name', {
      type: Sequelize.TEXT
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Routings', 'name')
  }
}
