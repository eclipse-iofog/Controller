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
    return queryInterface.removeColumn('Fogs', 'system-available-memory')
      .then(() => {
        return queryInterface.removeColumn('Fogs', 'system-available-disk')
      }).then(() => {
        return queryInterface.removeColumn('Fogs', 'system-total-cpu')
      })
    // restore constraints. Because Sequelize has problem with Sqlite constraints
      .then(() => {
        return queryInterface.addConstraint('Fogs', {
          fields: ['user_id'],
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
          fields: ['fog_type_id'],
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
