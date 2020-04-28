'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('VolumeMappings', 'type', {
      type: Sequelize.TEXT
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('VolumeMappings', 'type')
  }
}
