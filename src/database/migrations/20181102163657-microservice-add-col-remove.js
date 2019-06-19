'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Microservices',
        'delete',
        Sequelize.BOOLEAN
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Microservices', 'delete')
  },
}
