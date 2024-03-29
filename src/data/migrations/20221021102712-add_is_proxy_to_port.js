'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('MicroservicePorts', 'is_proxy',
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
    return queryInterface.removeColumn('MicroservicePorts', 'is_proxy')
  }
}
