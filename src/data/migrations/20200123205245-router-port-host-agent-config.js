'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return Promise.all([
      queryInterface.addColumn('Fogs', 'router_port', {
        type: Sequelize.INTEGER,
        defaultValue: 5672,
        field: 'router_port'
      }),
      queryInterface.addColumn('Fogs', 'router_host', {
        type: Sequelize.STRING,
        field: 'router_host'
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    return Promise.all([
      queryInterface.removeColumn('Fogs', 'router_host'),
      queryInterface.removeColumn('Fogs', 'router_port')
    ])
  }
}
