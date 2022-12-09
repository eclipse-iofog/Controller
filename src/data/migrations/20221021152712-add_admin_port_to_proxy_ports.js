'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('MicroserviceProxyPorts', 'admin_port',
      {
        type: Sequelize.BOOLEAN
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
    return queryInterface.removeColumn('MicroserviceProxyPorts', 'admin_port')
  }
}
