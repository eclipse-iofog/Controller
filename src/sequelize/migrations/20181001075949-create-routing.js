'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Routings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      isNetworkConnection: {
        type: Sequelize.BOOLEAN,
        field: 'is_network_connection'
      },
      publishingIofogId: {
        type: Sequelize.TEXT,
        field: 'publishing_iofog_uuid',
        references: {model: 'Fogs', key: 'uuid'},
        onDelete: 'cascade'
      },
      destinationIofogId: {
        type: Sequelize.TEXT,
        field: 'destination_iofog_uuid',
        references: {model: 'Fogs', key: 'uuid'},
        onDelete: 'cascade'
      },
      publishingMicroserviceUuid: {
        type: Sequelize.TEXT,
        field: 'publishing_microservice_uuid',
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
    return queryInterface.dropTable('Routings');
  }
};