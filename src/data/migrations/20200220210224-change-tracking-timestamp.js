'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ChangeTrackings', 'last_updated', {
      type: Sequelize.STRING,
      defaultValue: false,
      field: 'last_updated'
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ChangeTrackings', 'last_updated')
  }
}
