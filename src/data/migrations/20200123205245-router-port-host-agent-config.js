'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('Fogs', 'router_id', {
        type: Sequelize.INTEGER,
        field: 'router_id'
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('Fogs', 'router_id')
    ])
  }
}
