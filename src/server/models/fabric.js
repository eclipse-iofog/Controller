/**
 * @file fabric.js
 * @author Zishan Iqbal
 * @description This file includes a iofabrics model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Registry from './../models/registry';
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
  lastactive: {
    type: Sequelize.BIGINT,
    field: 'LastActive'
  },
  token: {
    type: Sequelize.TEXT,
    field: 'Token'
  },
  daemonstatus: {
    type: Sequelize.TEXT,
    defaultValue: "UNKNOWN",
    field: 'DaemonStatus'
  },
  daemonoperatingduration: {
    type: Sequelize.BIGINT,
    defaultValue: 0,
    field: 'DaemonOperatingDuration'
  },
  daemonlaststart: {
    type: Sequelize.BIGINT,
    field: 'DaemonLastStart'
  },
  memoryusage: {
    type: Sequelize.FLOAT,
    defaultValue: 0.000,
    field: 'MemoryUsage'
  },
  diskusage: {
    type: Sequelize.FLOAT,
    defaultValue: 0.000,
    field: 'DiskUsage'
  },
  cpuusage: {
    type: Sequelize.FLOAT,
    defaultValue: 0.00,
    field: 'CPUUsage'
  },
  memoryviolation: {
    type: Sequelize.TEXT,
    field: 'MemoryViolation'
  },
  diskviolation: {
    type: Sequelize.TEXT,
    field: 'DiskViolation'
  },
  cpuviolation: {
    type: Sequelize.TEXT,
    field: 'CPUViolation'
  },
  elementstatus: {
    type: Sequelize.TEXT,
    field: 'ElementStatus'
  },
  repositorycount: {
    type: Sequelize.BIGINT,
    field: 'RepositoryCount'
  },
  repositorystatus: {
    type: Sequelize.TEXT,
    field: 'RepositoryStatus'
  },
  systemtime: {
    type: Sequelize.BIGINT,
    field: 'SystemTime'
  },
  laststatustime: {
    type: Sequelize.BIGINT,
    field: 'LastStatusTime'
  },
  ipaddress: {
    type: Sequelize.TEXT,
    defaultValue: "0.0.0.0",
    field: 'IPAddress'
  },
  processedmessages: {
    type: Sequelize.BIGINT,
    defaultValue: 0,
    field: 'ProcessedMessages'
  },
  elementmessagecounts: {
    type: Sequelize.TEXT,
    field: 'ElementMessageCounts'
  },
  messagespeed: {
    type: Sequelize.BIGINT,
    field: 'MessageSpeed'
  },
  lastcommandtime: {
    type: Sequelize.BIGINT,
    field: 'LastCommandTime'
  },
  networkinterface: {
    type: Sequelize.TEXT,
    defaultValue: "eth0",
    field: 'NetworkInterface'
  },
  dockerurl: {
    type: Sequelize.TEXT,
    defaultValue: "unix:///var/run/docker.sock",
    field: 'DockerURL'
  },
  disklimit: {
    type: Sequelize.FLOAT,
    defaultValue: 50,
    field: 'DiskLimit'
  },
  diskdirectory: {
    type: Sequelize.TEXT,
    field: 'DiskDirectory'
  },
  memorylimit: {
    type: Sequelize.FLOAT,
    defaultValue: 4096,
    field: 'MemoryLimit'
  },
  cpulimit: {
    type: Sequelize.FLOAT,
    defaultValue: 80,
    field: 'CPULimit'
  },
  loglimit: {
    type: Sequelize.FLOAT,
    defaultValue: 10,
    field: 'LogLimit'
  },
  logdirectory: {
    type: Sequelize.TEXT,
    defaultValue: "/var/log/iofabric/",
    field: 'LogDirectory'
  },
  logfileCount: {
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

Registry.belongsTo(Fabric);
FabricProvisionKey.belongsTo(Fabric);

Fabric.belongsTo(FabricType, {
  foreignKey: 'typeKey'
})

export default Fabric;