'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Routings', 'application_id',
      {
        type: Sequelize.INTEGER,
        field: 'application_id',
        references: { model: 'Flows', key: 'id' },
        onDelete: 'cascade'
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    return queryInterface.removeColumn('Routings', 'application_id')
  }
}
