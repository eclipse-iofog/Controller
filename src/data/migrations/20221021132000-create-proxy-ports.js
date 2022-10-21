'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('MicroserviceProxyPorts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      portId: {
        type: Sequelize.INTEGER,
        field: 'port_id',
        references: { model: 'MicroservicePorts', key: 'id' },
        onDelete: 'cascade'
      },
      host: {
        type: Sequelize.STRING(128),
        field: 'host'
      },
      localProxyId: {
        type: Sequelize.STRING(32),
        field: 'local_proxy_id',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      },
      publicPort: {
        type: Sequelize.INTEGER,
        field: 'public_port'
      },
      protocol: {
        type: Sequelize.STRING(3),
        field: 'protocol'
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
    await queryInterface.dropTable('MicroserviceProxyPorts')
  }
}
