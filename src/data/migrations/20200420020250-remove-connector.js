'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Routings', 'connectorPortId')
      .then(() => queryInterface.removeColumn('MicroservicePublicModes', 'connectorPortId'))
      .then(() => queryInterface.dropTable('ConnectorPorts'))
      .then(() => queryInterface.dropTable('Connectors'))
  },

  down: (queryInterface, Sequelize) => {
    const connectorTable = queryInterface.createTable('Connectors', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      name: {
        type: Sequelize.TEXT,
        field: 'name'
      },
      domain: {
        type: Sequelize.TEXT,
        field: 'domain'
      },
      publicIp: {
        type: Sequelize.TEXT,
        field: 'public_ip'
      },
      cert: {
        type: Sequelize.TEXT,
        field: 'cert'
      },
      selfSignedCerts: {
        type: Sequelize.BOOLEAN,
        field: 'self_signed_certs'
      },
      devMode: {
        type: Sequelize.BOOLEAN,
        field: 'dev_mode'
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
      }
    })
    const connectorPortTable = queryInterface.createTable('ConnectorPorts', {
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
      connectorId: {
        type: Sequelize.INTEGER,
        field: 'connector_id',
        references: { model: 'Connectors', key: 'id' },
        onDelete: 'cascade'
      }
    })

    const connectorPortIdColumn = queryInterface.addColumn('Routings', 'connectorPortId', {
      type: Sequelize.INTEGER,
      field: 'connector_port_id',
      references: { model: 'ConnectorPorts', key: 'id' },
      onDelete: 'set null'
    })

    const msvcConnectorPortIdColumn = queryInterface.addColumn('MicroservicePublicModes', 'connectorPortId', {
      type: Sequelize.INTEGER,
      field: 'connector_port_id',
      references: { model: 'ConnectorPorts', key: 'id' },
      onDelete: 'set null'
    })

    return connectorTable
      .then(() => connectorPortTable)
      .then(() => connectorPortIdColumn)
      .then(() => msvcConnectorPortIdColumn)
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
  }
}
