'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Flow', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'

      },
      name: {
        type: Sequelize.TEXT,
        field: 'name'
      },
      description: {
        type: Sequelize.TEXT,
        field: 'description'
      },
      isActivated: {
        type: Sequelize.BOOLEAN,
        field: 'is_activated'
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
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Flow');
  }
};