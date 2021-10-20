'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('MicroservicePublicPorts', 'schemes',
      {
        type: Sequelize.TEXT,
        defaultValue: JSON.stringify(['https'])
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    return queryInterface.removeColumn('MicroservicePublicPorts', 'schemes')
  }
}
