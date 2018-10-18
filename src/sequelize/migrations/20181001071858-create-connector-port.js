'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ConnectorPorts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      port1: {
        type: Sequelize.INTEGER,
        field: 'port1'
      },
      port2: {
        type: Sequelize.INTEGER,
        field: 'port2'
      },
      maxConnectionsPort1: {
        type: Sequelize.INTEGER,
        field: 'max_connections_port1'
      },
      maxConnectionsPort2: {
        type: Sequelize.INTEGER,
        field: 'max_connection_port2'
      },
      passcodePort1: {
        type: Sequelize.TEXT,
        field: 'passcode_port1'
      },
      passcodePort2: {
        type: Sequelize.TEXT,
        field: 'passcode_port2'
      },
      heartBeatAbsenceThresholdPort1: {
        type: Sequelize.INTEGER,
        field: 'heartbeat_absence_threshold_port1'
      },
      heartBeatAbsenceThresholdPort2: {
        type: Sequelize.INTEGER,
        field: 'heartbeat_absence_threshold_port2'
      },
      mappingId: {
        type: Sequelize.TEXT,
        field: 'mapping_id'
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
      updatedBy: {
        type: Sequelize.INTEGER,
        field: 'updated_by',
        references: { model: 'Users', key: 'id' },
        onDelete: 'cascade'
      },
      connectorId: {
        type: Sequelize.INTEGER,
        field: 'connector_id',
        references: { model: 'Connectors', key: 'id' },
        onDelete: 'cascade'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ConnectorPorts');
  }
};