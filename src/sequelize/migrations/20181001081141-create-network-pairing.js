'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('NetworkPairings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      isPublicPort: {
        type: Sequelize.BOOLEAN,
        field: 'is_public_port'
      },
      iofogUuid1: {
        type: Sequelize.TEXT,
        field: 'iofog_uuid_1',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'cascade'
      },
      iofogUuid2: {
        type: Sequelize.TEXT,
        field: 'iofog_uuid_2',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'cascade'
      },
      microserviceUuid1: {
        type: Sequelize.TEXT,
        field: 'microservice_uuid_1',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      },
      microserviceUuid2: {
        type: Sequelize.TEXT,
        field: 'microservice_uuid_2',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      },
      networkMicroserviceUuid1: {
        type: Sequelize.TEXT,
        field: 'network_microservice_uuid_1',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      },
      networkMicroserviceUuid2: {
        type: Sequelize.TEXT,
        field: 'network_microservice_uuid_2',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      },
      microservicePortId1: {
        type: Sequelize.INTEGER,
        field: 'microservice_port_id_1',
        references: { model: 'MicroservicePorts', key: 'id' },
        onDelete: 'cascade'
      },
      satellitePortId: {
        type: Sequelize.INTEGER,
        field: 'satellite_port_id',
        references: { model: 'SatellitePorts', key: 'id' },
        onDelete: 'cascade'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('NetworkPairings');
  }
};