'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MicroservicePorts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      portInternal: {
        type: Sequelize.INTEGER,
        field: 'port_internal'
      },
      portExternal: {
        type: Sequelize.INTEGER,
        field: 'port_external'
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
      microserviceUuid: {
        type: Sequelize.TEXT,
        field: 'microservice_uuid',
        references: { model: 'Microservice', key: 'uuid' },
        onDelete: 'cascade'
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        field: 'updated_by',
        references: { model: 'User', key: 'id' },
        onDelete: 'cascade'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MicroservicePorts');
  }
};