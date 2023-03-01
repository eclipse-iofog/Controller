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
        return queryInterface.addConstraint('Fogs', {
          feilds: ['user_id'],
          type: 'foreign key',
          name: 'userId_fkey_constraint',
          references: {
            table: 'Users',
            field: 'id'
          },
          onDelete: 'cascade'
        })
      }).then(() => {
        return queryInterface.addConstraint('Fogs', {
          feilds: ['fog_type_id'],
          type: 'foreign key',
          name: 'fogTypeId_fkey_constraint',
          references: {
            table: 'FogTypes',
            field: 'id'
          },
          onDelete: 'set null'
        })
      })
  }
}
