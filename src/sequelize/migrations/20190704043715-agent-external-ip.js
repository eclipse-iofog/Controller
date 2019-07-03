'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Fogs',
        'ip_address_external', Sequelize.TEXT
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Fogs', 'ip_address_external')
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