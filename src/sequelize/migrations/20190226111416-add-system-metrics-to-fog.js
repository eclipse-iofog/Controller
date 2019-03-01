'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Fogs',
        'system-available-memory', Sequelize.BIGINT
    ).then(() => {
      return queryInterface.addColumn('Fogs',
          'system-available-disk', Sequelize.BIGINT
      )
    }).then(() => {
      return queryInterface.addColumn('Fogs',
          'system-total-cpu', Sequelize.FLOAT
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    return queryInterface.removeColumn('Fogs', 'system-available-memory')
        .then(() => {
          return queryInterface.removeColumn('Fogs', 'system-available-disk')
        }).then(() => {
          return queryInterface.removeColumn('Fogs', 'system-total-cpu')
        })
    // restore constraints. Because Sequelize has problem with Sqlite constraints
        .then(() => {
          return queryInterface.addConstraint('Fogs', ['user_id'], {
            type: 'FOREIGN KEY',
            name: 'userId',
            references: {
              name: 'userId',
              table: 'Users',
              field: 'id',
            },
            onDelete: 'cascade',
          })
        }).then(() => {
          return queryInterface.addConstraint('Fogs', ['fog_type_id'], {
            type: 'FOREIGN KEY',
            name: 'fogTypeId',
            references: {
              name: 'fogTypeId',
              table: 'FogTypes',
              field: 'id',
            },
            onDelete: 'set null',
          })
        })
  },
}
