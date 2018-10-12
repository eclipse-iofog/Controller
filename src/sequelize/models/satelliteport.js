'use strict';
module.exports = (sequelize, DataTypes) => {
  const SatellitePort = sequelize.define('SatellitePort', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    port1: {
      type: DataTypes.INTEGER,
      field: 'port1'
    },
    port2: {
      type: DataTypes.INTEGER,
      field: 'port2'
    },
    maxConnectionsPort1: {
      type: DataTypes.INTEGER,
      field: 'max_connections_port1'
    },
    maxConnectionsPort2: {
      type: DataTypes.INTEGER,
      field: 'max_connection_port2'
    },
    passcodePort1: {
      type: DataTypes.TEXT,
      field: 'passcode_port1'
    },
    passcodePort2: {
      type: DataTypes.TEXT,
      field: 'passcode_port2'
    },
    heartBeatAbsenceThresholdPort1: {
      type: DataTypes.INTEGER,
      field: 'heartbeat_absence_threshold_port1'
    },
    heartBeatAbsenceThresholdPort2: {
      type: DataTypes.INTEGER,
      field: 'heartbeat_absence_threshold_port2'
    },
    mappingId: {
      type: DataTypes.TEXT,
      field: 'mapping_id'
    }
  }, {
    timestamps: true,
    underscored: true
  });
  SatellitePort.associate = function(models) {

    SatellitePort.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updatedBy',
      onDelete: 'cascade'
    });

    SatellitePort.belongsTo(models.Satellite, {
      foreignKey: {
        name: 'satelliteId',
        field: 'satellite_id'
      },
      as: 'satellite',
      onDelete: 'cascade'
    });
  };
  return SatellitePort;
};