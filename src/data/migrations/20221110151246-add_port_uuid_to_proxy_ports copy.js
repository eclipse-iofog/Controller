'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('MicroserviceProxyPorts', 'port_uuid',
      {
        type: Sequelize.TEXT
      }
    )
    await queryInterface.addColumn('MicroserviceProxyPorts', 'server_token',
      {
        type: Sequelize.TEXT
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
    await queryInterface.removeColumn('MicroserviceProxyPorts', 'port_uuid')
    await queryInterface.removeColumn('MicroserviceProxyPorts', 'server_token')
  }
}
