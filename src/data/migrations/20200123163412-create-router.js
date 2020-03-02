'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Routers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      isEdge: {
        type: Sequelize.BOOLEAN,
        field: 'is_edge'
      },
      messagingPort: {
        type: Sequelize.INTEGER,
        field: 'messaging_port'
      },
      edgeRouterPort: {
        type: Sequelize.INTEGER,
        field: 'edge_router_port'
      },
      interRouterPort: {
        type: Sequelize.INTEGER,
        field: 'inter_router_port'
      },
      host: {
        type: Sequelize.TEXT,
        field: 'host'
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        field: 'is_default'
      },
      iofogUuid: {
        type: Sequelize.STRING(32),
        field: 'iofog_uuid',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'cascade'
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
    })

    await queryInterface.createTable('RouterConnections', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      sourceRouter: {
        type: Sequelize.INTEGER,
        field: 'source_router',
        references: { model: 'Routers', key: 'id' },
        onDelete: 'cascade'
      },
      destRouter: {
        type: Sequelize.INTEGER,
        field: 'dest_router',
        references: { model: 'Routers', key: 'id' },
        onDelete: 'cascade'
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
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Routers')
    await queryInterface.dropTable('RouterConnections')
  }
}
