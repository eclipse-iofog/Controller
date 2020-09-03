'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('MicroserviceStatuses', 'percentage', {
      type: Sequelize.FLOAT,
      defaultValue: 0.00
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('MicroserviceStatuses', 'percentage')
  }
}
