'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MicroserviceConnections', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      sourceMicroserviceUuid: {
        type: Sequelize.TEXT,
        field: 'source_microservice_uuid',
        references: {model: 'Microservices', key: 'uuid'},
        onDelete: 'cascade'
      },
      destinationMicroserviceUuid: {
        type: Sequelize.TEXT,
        field: 'destination_microservice_uuid',
        references: {model: 'Microservices', key: 'uuid'},
        onDelete: 'cascade'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MicroserviceConnections');
  }
};