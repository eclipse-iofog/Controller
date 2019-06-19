'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Flows', 'updated_by')
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Flows',
        'updated_by',
        Sequelize.INTEGER
    )
  },
}
