'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Config', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'

      },
      key: {
        type: Sequelize.TEXT,
        field: 'key',
        unique: true,
        allowNull: false
      },
      value: {
        type: Sequelize.TEXT,
        field: 'value',
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at'
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        field: 'updated_by',
        references: { model: 'Users', key: 'id' },
        onDelete: 'set null'
      }
    }).then(() => queryInterface.addIndex('Config', ['key'], { indicesType: 'UNIQUE' }))
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Config')
  }
}
