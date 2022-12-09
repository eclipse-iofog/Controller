'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('MicroserviceProxyPorts', 'proxy_token',
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
    return queryInterface.removeColumn('MicroserviceProxyPorts', 'proxy_token')
  }
}
