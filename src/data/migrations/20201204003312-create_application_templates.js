'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ApplicationTemplates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.TEXT,
        field: 'name',
        defaultValue: 'new-application-template',
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        field: 'description',
        defaultValue: ''
      },
      schemaVersion: {
        type: Sequelize.TEXT,
        field: 'schema_version',
        defaultValue: ''
      },
      applicationJSON: {
        type: Sequelize.TEXT,
        field: 'application_json',
        defaultValue: '{}'
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
      }
    })
    await queryInterface.createTable('ApplicationTemplateVariables', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      key: {
        type: Sequelize.TEXT,
        field: 'key'
      },
      description: {
        type: Sequelize.TEXT,
        field: 'description',
        defaultValue: ''
      },
      defaultValue: {
        type: Sequelize.TEXT,
        field: 'default_value'
      },
      applicationTemplateId: {
        type: Sequelize.INTEGER,
        field: 'application_template_id',
        references: { model: 'ApplicationTemplates', key: 'id' },
        onDelete: 'cascade'
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
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ApplicationTemplates')
    await queryInterface.dropTable('ApplicationTemplateVariables')
  }
}
