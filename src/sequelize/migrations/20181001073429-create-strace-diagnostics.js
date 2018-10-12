'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('StraceDiagnostics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      straceRun: {
        type: Sequelize.BOOLEAN,
        field: 'straceRun'
      },
      buffer: {
        type: Sequelize.TEXT,
        field: 'buffer',
        defaultValue: '',
      },
      microserviceUuid: {
        type: Sequelize.TEXT,
        field: 'microservice_uuid',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('StraceDiagnostics');
  }
};