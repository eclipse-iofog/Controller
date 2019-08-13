'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MicroserviceStatuses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      status: {
        type: Sequelize.TEXT,
        field: 'status'
      },
      cpuUsage: {
        type: Sequelize.FLOAT,
        defaultValue: 0.000,
        field: 'cpu_usage'
      },
      memoryUsage: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        field: 'memory_usage'
      },
      containerId: {
        type: Sequelize.TEXT,
        field: 'container_id'
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
        type: Sequelize.STRING(32),
        field: 'microservice_uuid',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MicroserviceStatuses')
  }
}
