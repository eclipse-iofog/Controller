/**
 * @file fabric.js
 * @author Zishan Iqbal
 * @description This file includes a iofabrics model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import FabricProvisionKey from './fabricProvisionKey';
import ChangeTracking from './changeTracking';
import FabricType from './fabricType';

const Fabric = sequelize.define('iofabrics', {
  uuid: {
    type: Sequelize.TEXT,
    primaryKey: true,
    field: 'UUID'
  },
  name: {
    type: Sequelize.TEXT,
    defaultValue: "Unnamed ioFabric 1",
    field: 'Name'
  },
  location: {
    type: Sequelize.TEXT,
    field: 'Location'
  },
  latitude: {
    type: Sequelize.TEXT,
    field: 'Latitude'
  },
  longitude: {
    type: Sequelize.TEXT,
    field: 'Longitude'
  },
  description: {
    type: Sequelize.TEXT,
    field: 'Description'
  },
  lastActive: {
    type: Sequelize.BIGINT,
    field: 'LastActive'
  },
  token: {
    type: Sequelize.TEXT,
    field: 'Token'
  },
  daemonStatus: {
    type: Sequelize.TEXT,
    defaultValue: "UNKNOWN",
    field: 'DaemonStatus'
  },
  daemonOperatingDuration: {
    type: Sequelize.BIGINT,
    defaultValue: 0,
    field: 'DaemonOperatingDuration'
  },
  daemonLastStart: {
    type: Sequelize.BIGINT,
    field: 'DaemonLastStart'
  },
  memoryUsage: {
    type: Sequelize.FLOAT,
    defaultValue: 0.000,
    field: 'MemoryUsage'
  },
  diskUsage: {
    type: Sequelize.FLOAT,
    defaultValue: 0.000,
    field: 'DiskUsage'
  },
  cpuUsage: {
    type: Sequelize.FLOAT,
    defaultValue: 0.00,
    field: 'CPUUsage'
  },
  memoryViolation: {
    type: Sequelize.TEXT,
    field: 'MemoryViolation'
  },
  diskViolation: {
    type: Sequelize.TEXT,
    field: 'DiskViolation'
  },
  cpuViolation: {
    type: Sequelize.TEXT,
    field: 'CPUViolation'
  },
  elementStatus: {
    type: Sequelize.TEXT,
    field: 'ElementStatus'
  },
  repositoryCount: {
    type: Sequelize.BIGINT,
    field: 'RepositoryCount'
  },
  repositoryStatus: {
    type: Sequelize.TEXT,
    field: 'RepositoryStatus'
  },
  systemTime: {
    type: Sequelize.BIGINT,
    field: 'SystemTime'
  },
  lastStatusTime: {
    type: Sequelize.BIGINT,
    field: 'LastStatusTime'
  },
  ipAddress: {
    type: Sequelize.TEXT,
    defaultValue: "0.0.0.0",
    field: 'IPAddress'
  },
  processedMessages: {
    type: Sequelize.BIGINT,
    defaultValue: 0,
    field: 'ProcessedMessages'
  },
  elementMessageCounts: {
    type: Sequelize.TEXT,
    field: 'ElementMessageCounts'
  },
  messageSpeed: {
    type: Sequelize.BIGINT,
    field: 'MessageSpeed'
  },
  lastCommandTime: {
    type: Sequelize.BIGINT,
    field: 'LastCommandTime'
  },
  networkInterface: {
    type: Sequelize.TEXT,
    defaultValue: "eth0",
    field: 'NetworkInterface'
  },
  dockerURL: {
    type: Sequelize.TEXT,
    defaultValue: "unix:///var/run/docker.sock",
    field: 'DockerURL'
  },
  diskLimit: {
    type: Sequelize.FLOAT,
    defaultValue: 50,
    field: 'DiskLimit'
  },
  diskDirectory: {
    type: Sequelize.TEXT,
    field: 'DiskDirectory'
  },
  memoryLimit: {
    type: Sequelize.FLOAT,
    defaultValue: 4096,
    field: 'MemoryLimit'
  },
  cpuLimit: {
    type: Sequelize.FLOAT,
    defaultValue: 80,
    field: 'CPULimit'
  },
  logLimit: {
    type: Sequelize.FLOAT,
    defaultValue: 10,
    field: 'LogLimit'
  },
  logDirectory: {
    type: Sequelize.TEXT,
    defaultValue: "/var/log/iofabric/",
    field: 'LogDirectory'
  },
  logFileCount: {
    type: Sequelize.BIGINT,
    defaultValue: 10,
    field: 'LogFileCount'
  },
  version: {
    type: Sequelize.TEXT,
    field: 'Version'
  }
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
Fabric.belongsTo(FabricType, {
  foreignKey: 'typeKey'
})

export default Fabric;