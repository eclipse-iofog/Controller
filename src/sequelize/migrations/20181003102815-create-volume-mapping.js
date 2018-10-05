'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('VolumeMappings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'uuid'
      },
      hostDestination: {
        type: Sequelize.TEXT,
        field: 'host_destination'
      },
      containerDestination: {
        type: Sequelize.TEXT,
        field: 'container_destination'
      },
      accessMode: {
        type: Sequelize.TEXT,
        field: 'access_mode'
      },
      microserviceUuid: {
        type: Sequelize.TEXT,
        field: 'microservice_uuid',
        references: {model: 'Microservices', key: 'uuid'},
        onDelete: 'cascade'
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('VolumeMappings');
  }
};