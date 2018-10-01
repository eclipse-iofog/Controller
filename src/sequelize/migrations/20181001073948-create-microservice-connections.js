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
      sourceMicroservice: {
        type: Sequelize.TEXT,
        field: 'source_microservice',
        references: { model: 'Microservice', key: 'uuid' },
        onDelete: 'cascade'
      },
      destinationMicroservice: {
        type: Sequelize.TEXT,
        field: 'destination_microservice',
        references: { model: 'Microservice', key: 'uuid' },
        onDelete: 'cascade'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MicroserviceConnections');
  }
};