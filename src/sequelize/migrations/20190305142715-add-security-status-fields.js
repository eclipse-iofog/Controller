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
        return queryInterface.addConstraint('Fogs', ['user_id'], {
          type: 'FOREIGN KEY',
          name: 'userId',
          references: {
            name: 'userId',
            table: 'Users',
            field: 'id'
          },
          onDelete: 'cascade'
        })
      }).then(() => {
        return queryInterface.addConstraint('Fogs', ['fog_type_id'], {
          type: 'FOREIGN KEY',
          name: 'fogTypeId',
          references: {
            name: 'fogTypeId',
            table: 'FogTypes',
            field: 'id'
          },
          onDelete: 'set null'
        })
      })
  }
}
