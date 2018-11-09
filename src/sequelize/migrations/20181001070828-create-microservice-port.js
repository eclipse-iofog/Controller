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
      isPublic: {
        type: Sequelize.BOOLEAN,
        field: 'is_public'
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
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: { model: 'Users', key: 'id' },
        onDelete: 'cascade'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MicroservicePorts');
  }
};