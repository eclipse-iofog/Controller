'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Fogs',
      'security_status', Sequelize.TEXT
    ).then(() => {
      return queryInterface.addColumn('Fogs',
        'security_violation_info', Sequelize.TEXT
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Fogs', 'security_status')
      .then(() => {
        return queryInterface.removeColumn('Fogs', 'security_violation_info')
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
        return queryInterface.addConstraint('Fogs',  {
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
