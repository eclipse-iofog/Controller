/**
* @file fabric.js
* @author Zishan Iqbal
* @description This file includes a iofabrics model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import FabricProvisionKey from './fabricProvisionKey';
import ChangeTracking from './changeTracking';

const Fabric = sequelize.define('iofabrics', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  uuid: {type: Sequelize.TEXT, field: 'UUID'},
  name: {type: Sequelize.TEXT, field: 'Name'},
  location: {type: Sequelize.TEXT, field: 'Location'},
  latitude: {type: Sequelize.TEXT, field: 'Latitude'},
  longitude: {type: Sequelize.TEXT, field: 'Longitude'},
  orgID: {type: Sequelize.BIGINT, field: 'OrgID'},
  description: {type: Sequelize.TEXT, field: 'Description'},
  lastActive: {type: Sequelize.BIGINT, field: 'LastActive'},
  token: {type: Sequelize.TEXT, field: 'Token'},
  typeKey: {type: Sequelize.BIGINT, field: 'TypeKey'},
  daemonStatus: {type: Sequelize.TEXT, field: 'DaemonStatus'},
  daemonOperatingDuration: {type: Sequelize.BIGINT, field: 'DaemonOperatingDuration'},
  daemonLastStart: {type: Sequelize.BIGINT, field: 'DaemonLastStart'},
  memoryUsage: {type: Sequelize.FLOAT, field: 'MemoryUsage'},
  diskUsage: {type: Sequelize.FLOAT, field: 'DiskUsage'},
  cpuUsage: {type: Sequelize.FLOAT, field: 'CPUUsage'},
  memoryViolation: {type: Sequelize.TEXT, field: 'MemoryViolation'},
  diskViolation: {type: Sequelize.TEXT, field: 'DiskViolation'},
  cpuViolation: {type: Sequelize.TEXT, field: 'CPUViolation'},
  elementStatus: {type: Sequelize.TEXT, field: 'ElementStatus'},
  repositoryCount: {type: Sequelize.BIGINT, field: 'RepositoryCount'},
  repositoryStatus: {type: Sequelize.TEXT, field: 'RepositoryStatus'},
  systemTime: {type: Sequelize.BIGINT, field: 'SystemTime'},
  lastStatusTime: {type: Sequelize.BIGINT, field: 'LastStatusTime'},
  ipAddress: {type: Sequelize.TEXT, field: 'IPAddress'},
  processedMessages: {type: Sequelize.BIGINT, field: 'ProcessedMessages'},
  elementMessageCounts: {type: Sequelize.TEXT, field: 'ElementMessageCounts'},
  messageSpeed: {type: Sequelize.BIGINT, field: 'MessageSpeed'},
  lastCommandTime: {type: Sequelize.BIGINT, field: 'LastCommandTime'},
  networkInterface: {type: Sequelize.TEXT, field: 'NetworkInterface'},
  dockerURL: {type: Sequelize.TEXT, field: 'DockerURL'},
  diskLimit: {type: Sequelize.FLOAT, field: 'DiskLimit'},
  diskDirectory: {type: Sequelize.TEXT, field: 'DiskDirectory'},
  memoryLimit: {type: Sequelize.FLOAT, field: 'MemoryLimit'},
  cpuLimit: {type: Sequelize.FLOAT, field: 'CPULimit'},
  logLimit: {type: Sequelize.FLOAT, field: 'LogLimit'},
  logDirectory: {type: Sequelize.TEXT, field: 'LogDirectory'},
  logFileCount: {type: Sequelize.BIGINT, field: 'LogFileCount'},
  version: {type: Sequelize.TEXT, field: 'Version'}
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

FabricProvisionKey.belongsTo(Fabric);
ChangeTracking.belongsTo(Fabric);

export default Fabric;
