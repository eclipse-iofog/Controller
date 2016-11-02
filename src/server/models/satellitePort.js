/**
 * @file satellitePort.js
 * @author Zishan Iqbal
 * @description
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Satellite from './satellite';

const SatellitePort = sequelize.define('satellite_port', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  port1: {
    type: Sequelize.BIGINT,
    field: 'port1'
  },
  port2: {
    type: Sequelize.BIGINT,
    field: 'port2'
  },
  maxConnectionsPort1: {
    type: Sequelize.BIGINT,
    field: 'max_connections_port1'
  },
  maxConnectionsPort2: {
    type: Sequelize.BIGINT,
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
    type: Sequelize.BIGINT,
    field: 'heartbeat_absence_threshold_port1'
  },
  heartBeatAbsenceThresholdPort2: {
    type: Sequelize.BIGINT,
    field: 'heartbeat_absence_threshold_port2'
  },
  mappingId: {
    type: Sequelize.TEXT,
    field: 'mapping_id'
  },
  updatedBy: {
    type: Sequelize.BIGINT,
    field: 'updated_by'
  },
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: true,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

SatellitePort.belongsTo(Satellite);

export default SatellitePort;