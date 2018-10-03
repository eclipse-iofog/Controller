'use strict';
module.exports = (sequelize, DataTypes) => {
  const Fog = sequelize.define('Fog', {
    uuid: {
      type: DataTypes.TEXT,
      primaryKey: true,
      allowNull: false,
      field: 'uuid'
    },
    name: {
      type: DataTypes.TEXT,
      defaultValue: "Unnamed ioFog 1",
      field: 'name'
    },
    location: {
      type: DataTypes.TEXT,
      field: 'location'
    },
    gpsMode: {
      type: DataTypes.TEXT,
      field: 'gps_mode'
    },
    latitude: {
      type: DataTypes.TEXT,
      field: 'latitude'
    },
    longitude: {
      type: DataTypes.TEXT,
      field: 'longitude'
    },
    description: {
      type: DataTypes.TEXT,
      field: 'description'
    },
    lastactive: {
      type: DataTypes.BIGINT,
      field: 'last_active'
    },
    daemonStatus: {
      type: DataTypes.TEXT,
      defaultValue: "UNKNOWN",
      field: 'daemon_status'
    },
    daemonOperatingDuration: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'daemon_operating_duration'
    },
    daemonLastStart: {
      type: DataTypes.BIGINT,
      field: 'daemon_last_start'
    },
    memoryUsage: {
      type: DataTypes.FLOAT,
      defaultValue: 0.000,
      field: 'memory_usage'
    },
    diskUsage: {
      type: DataTypes.FLOAT,
      defaultValue: 0.000,
      field: 'disk_usage'
    },
    cpuUsage: {
      type: DataTypes.FLOAT,
      defaultValue: 0.00,
      field: 'cpu_usage'
    },
    memoryViolation: {
      type: DataTypes.TEXT,
      field: 'memory_violation'
    },
    diskViolation: {
      type: DataTypes.TEXT,
      field: 'disk_violation'
    },
    cpuViolation: {
      type: DataTypes.TEXT,
      field: 'cpu_violation'
    },
    catalogItemStatus: {
      type: DataTypes.TEXT,
      field: 'catalog_item_status'
    },
    repositoryCount: {
      type: DataTypes.BIGINT,
      field: 'repository_count'
    },
    repositoryStatus: {
      type: DataTypes.TEXT,
      field: 'repository_status'
    },
    systemTime: {
      type: DataTypes.BIGINT,
      field: 'system_time'
    },
    lastStatusTime: {
      type: DataTypes.BIGINT,
      field: 'last_status_time'
    },
    ipAddress: {
      type: DataTypes.TEXT,
      defaultValue: "0.0.0.0",
      field: 'ip_address'
    },
    processedMessages: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'processed_messages'
    },
    catalogItemMessageCounts: {
      type: DataTypes.TEXT,
      field: 'catalog_item_message_counts'
    },
    messageSpeed: {
      type: DataTypes.BIGINT,
      field: 'message_speed'
    },
    lastCommandTime: {
      type: DataTypes.BIGINT,
      field: 'last_command_time'
    },
    networkInterface: {
      type: DataTypes.TEXT,
      defaultValue: "eth0",
      field: 'network_interface'
    },
    dockerUrl: {
      type: DataTypes.TEXT,
      defaultValue: "unix:///var/run/docker.sock",
      field: 'docker_url'
    },
    diskLimit: {
      type: DataTypes.FLOAT,
      defaultValue: 50,
      field: 'disk_limit'
    },
    diskDirectory: {
      type: DataTypes.TEXT,
      defaultValue: '/var/lib/iofog/',
      field: 'disk_directory'
    },
    memoryLimit: {
      type: DataTypes.FLOAT,
      defaultValue: 4096,
      field: 'memory_limit'
    },
    cpuLimit: {
      type: DataTypes.FLOAT,
      defaultValue: 80,
      field: 'cpu_limit'
    },
    logLimit: {
      type: DataTypes.FLOAT,
      defaultValue: 10,
      field: 'log_limit'
    },
    logDirectory: {
      type: DataTypes.TEXT,
      defaultValue: "/var/log/iofog/",
      field: 'log_directory'
    },
    bluetooth: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'bluetooth'
    },
    hal: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'hal'
    },
    logFileCount: {
      type: DataTypes.BIGINT,
      defaultValue: 10,
      field: 'log_file_count'
    },
    version: {
      type: DataTypes.TEXT,
      field: 'version'
    },
    isReadyToUpgrade: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
      field: "is_ready_to_upgrade"
    },
    isReadyToRollback: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
      field: "is_ready_to_rollback"
    },
    statusFrequency: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      field: 'status_frequency'
    },
    changeFrequency: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
      field: 'change_frequency'
    },
    scanFrequency: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
      field: 'scan_frequency'
    },
    proxy: {
      type: DataTypes.TEXT,
      defaultValue: "",
      field: 'proxy'
    },
    isolatedDockerContainer: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
      field: 'isolated_docker_container'
    }
  }, {
    timestamps: true,
    underscored: true
  });
  Fog.associate = function(models) {

    Fog.belongsTo(models.FogType, {
      foreignKey: 'fog_type_id',
      as: 'fogTypeId',
      defaultValue: 0
    });

    Fog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'userId',
      defaultValue: 0,
      onDelete: 'cascade'
    });
  };
  return Fog;
};