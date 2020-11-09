'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('EdgeResources', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      version: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      description: Sequelize.TEXT,
      displayName: { type: Sequelize.TEXT, field: 'display_name' },
      displayIcon: { type: Sequelize.TEXT, field: 'display_icon' },
      displayColor: { type: Sequelize.TEXT, field: 'display_color' },
      interfaceProtocol: { type: Sequelize.TEXT, field: 'interface_protocol' },
      interfaceId: { type: Sequelize.INTEGER, field: 'interface_id' },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: { model: 'Users', key: 'id' },
        onDelete: 'cascade'
      }
    })
    await queryInterface.createTable('AgentEdgeResources', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      EdgeResourceId: {
        type: Sequelize.INTEGER,
        field: 'edge_resource_id',
        references: { model: 'EdgeResources', key: 'id' },
        onDelete: 'cascade'
      },
      FogUuid: {
        type: Sequelize.TEXT,
        field: 'fog_uuid',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'cascade'
      }
    })
    await queryInterface.createTable('EdgeResourceOrchestrationTags', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      EdgeResourceId: {
        type: Sequelize.INTEGER,
        field: 'edge_resource_id',
        references: { model: 'EdgeResources', key: 'id' },
        onDelete: 'cascade'
      },
      TagId: {
        type: Sequelize.INTEGER,
        field: 'tag_id',
        references: { model: 'Tags', key: 'id' },
        onDelete: 'cascade'
      }
    })
    await queryInterface.createTable('HTTPBasedResourceInterfaces', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      edgeResourceId: {
        type: Sequelize.INTEGER,
        field: 'edge_resource_id',
        references: { model: 'EdgeResources', key: 'id' },
        onDelete: 'cascade'
      }
    })
    await queryInterface.createTable('HTTPBasedResourceInterfaceEndpoints', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: Sequelize.TEXT,
      description: Sequelize.TEXT,
      method: Sequelize.TEXT,
      url: Sequelize.TEXT,
      requestType: { type: Sequelize.TEXT, field: 'request_type' },
      responseType: { type: Sequelize.TEXT, field: 'response_type' },
      requestPayloadExample: { type: Sequelize.TEXT, field: 'request_payload_example' },
      responsePayloadExample: { type: Sequelize.TEXT, field: 'response_payload_example' },
      interfaceId: {
        type: Sequelize.INTEGER,
        field: 'interface_id',
        references: { model: 'HTTPBasedResourceInterfaces', key: 'id' },
        onDelete: 'cascade'
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('EdgeResources')
    await queryInterface.dropTable('AgentEdgeResources')
    await queryInterface.dropTable('EdgeResourceOrchestrationTags')
    await queryInterface.dropTable('HTTPBasedResourceInterfaces')
    await queryInterface.dropTable('HTTPBasedResourceInterfaceEndpoints')
  }
}
