'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MicroservicePublicModes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      microserviceUuid: {
        type: Sequelize.TEXT,
        field: 'microservice_uuid',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      },
      networkMicroserviceUuid: {
        type: Sequelize.TEXT,
        field: 'network_microservice_uuid',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'set null'
      },
      iofogUuid: {
        type: Sequelize.TEXT,
        field: 'iofog_uuid',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'set null'
      },
      microservicePortId: {
        type: Sequelize.INTEGER,
        field: 'microservice_port_id',
        references: { model: 'MicroservicePorts', key: 'id' },
        onDelete: 'set null'
      },
      connectorPortId: {
        type: Sequelize.INTEGER,
        field: 'connector_port_id',
        references: { model: 'ConnectorPorts', key: 'id' },
        onDelete: 'set null'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MicroservicePublicModes')
  }
}
