'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Flows', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'

      },
      name: {
        type: Sequelize.TEXT,
        field: 'name',
        defaultValue: 'New Application'
      },
      description: {
        type: Sequelize.TEXT,
        field: 'description',
        defaultValue: ''
      },
      isActivated: {
        type: Sequelize.BOOLEAN,
        field: 'is_activated',
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'created_at'
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updated_at'
      },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: { model: 'Users', key: 'id' },
        onDelete: 'cascade'
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        field: 'updated_by',
        references: { model: 'Users', key: 'id' },
        onDelete: 'set null'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Flows')
  }
}
