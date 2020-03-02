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
      queryInterface.addColumn('Fogs', 'is_system', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_system'
      }),
      queryInterface.addColumn('Flows', 'is_system', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_system'
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
      queryInterface.removeColumn('Fogs', 'is_system'),
      queryInterface.removeColumn('Flows', 'is_system')
    ])
  }
}
