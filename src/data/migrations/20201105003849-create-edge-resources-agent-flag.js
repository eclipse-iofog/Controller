'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ChangeTrackings', 'linked_edge_resources', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'linked_edge_resources'
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ChangeTrackings', 'linked_edge_resources')
  }
}
