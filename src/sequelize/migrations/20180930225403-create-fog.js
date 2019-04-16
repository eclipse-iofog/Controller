'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Fogs', {
      uuid: {
        type: Sequelize.TEXT,
        primaryKey: true,
        allowNull: false,
        field: 'uuid',
      },
      name: {
        type: Sequelize.TEXT,
        defaultValue: 'Unnamed ioFog 1',
        field: 'name',
      },
      location: {
        type: Sequelize.TEXT,
        field: 'location',
      },
      gpsMode: {
        type: Sequelize.TEXT,
        field: 'gps_mode',
      },
      latitude: {
        type: Sequelize.FLOAT,
        field: 'latitude',
      },
      longitude: {
        type: Sequelize.FLOAT,
        field: 'longitude',
      },
      description: {
        type: Sequelize.TEXT,
        field: 'description',
      },
      lastactive: {
        type: Sequelize.BIGINT,
        field: 'last_active',
      },
      daemonStatus: {
        type: Sequelize.TEXT,
        defaultValue: 'UNKNOWN',
        field: 'daemon_status',
      },
      daemonOperatingDuration: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        field: 'daemon_operating_duration',
      },
      daemonLastStart: {
        type: Sequelize.BIGINT,
        field: 'daemon_last_start',
      },
      memoryUsage: {
        type: Sequelize.FLOAT,
        defaultValue: 0.000,
        field: 'memory_usage',
      },
      diskUsage: {
        type: Sequelize.FLOAT,
        defaultValue: 0.000,
        field: 'disk_usage',
      },
      cpuUsage: {
        type: Sequelize.FLOAT,
        defaultValue: 0.00,
        field: 'cpu_usage',
      },
      memoryViolation: {
        type: Sequelize.TEXT,
        field: 'memory_violation',
      },
      diskViolation: {
        type: Sequelize.TEXT,
        field: 'disk_violation',
      },
      cpuViolation: {
        type: Sequelize.TEXT,
        field: 'cpu_violation',
      },
      catalogItemStatus: {
        type: Sequelize.TEXT,
        field: 'catalog_item_status',
      },
      repositoryCount: {
        type: Sequelize.BIGINT,
        field: 'repository_count',
      },
      repositoryStatus: {
        type: Sequelize.TEXT,
        field: 'repository_status',
      },
      systemTime: {
        type: Sequelize.BIGINT,
        field: 'system_time',
      },
      lastStatusTime: {
        type: Sequelize.BIGINT,
        field: 'last_status_time',
      },
      ipAddress: {
        type: Sequelize.TEXT,
        defaultValue: '0.0.0.0',
        field: 'ip_address',
      },
      processedMessages: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        field: 'processed_messages',
      },
      catalogItemMessageCounts: {
        type: Sequelize.TEXT,
        field: 'catalog_item_message_counts',
      },
      messageSpeed: {
        type: Sequelize.BIGINT,
        field: 'message_speed',
      },
      lastCommandTime: {
        type: Sequelize.BIGINT,
        field: 'last_command_time',
      },
      networkInterface: {
        type: Sequelize.TEXT,
        defaultValue: 'eth0',
        field: 'network_interface',
      },
      dockerUrl: {
        type: Sequelize.TEXT,
        defaultValue: 'unix:///var/run/docker.sock',
        field: 'docker_url',
      },
      diskLimit: {
        type: Sequelize.FLOAT,
        defaultValue: 50,
        field: 'disk_limit',
      },
      diskDirectory: {
        type: Sequelize.TEXT,
        defaultValue: '/var/lib/iofog/',
        field: 'disk_directory',
      },
      memoryLimit: {
        type: Sequelize.FLOAT,
        defaultValue: 4096,
        field: 'memory_limit',
      },
      cpuLimit: {
        type: Sequelize.FLOAT,
        defaultValue: 80,
        field: 'cpu_limit',
      },
      logLimit: {
        type: Sequelize.FLOAT,
        defaultValue: 10,
        field: 'log_limit',
      },
      logDirectory: {
        type: Sequelize.TEXT,
        defaultValue: '/var/log/iofog/',
        field: 'log_directory',
      },
      bluetoothEnabled: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'bluetooth',
      },
      abstractedHardwareEnabled: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'hal',
      },
      logFileCount: {
        type: Sequelize.BIGINT,
        defaultValue: 10,
        field: 'log_file_count',
      },
      version: {
        type: Sequelize.TEXT,
        field: 'version',
      },
      isReadyToUpgrade: {
        type: Sequelize.BOOLEAN,
        defaultValue: 1,
        field: 'is_ready_to_upgrade',
      },
      isReadyToRollback: {
        type: Sequelize.BOOLEAN,
        defaultValue: 0,
        field: 'is_ready_to_rollback',
      },
      statusFrequency: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
        field: 'status_frequency',
      },
      changeFrequency: {
        type: Sequelize.INTEGER,
        defaultValue: 20,
        field: 'change_frequency',
      },
      deviceScanFrequency: {
        type: Sequelize.INTEGER,
        defaultValue: 20,
        field: 'device_scan_frequency',
      },
      tunnel: {
        type: Sequelize.TEXT,
        defaultValue: '',
        field: 'tunnel',
      },
      watchdogEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: 1,
        field: 'isolated_docker_container',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'created_at',
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updated_at',
      },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: { model: 'Users', key: 'id' },
        onDelete: 'cascade',
      },
      fogTypeId: {
        type: Sequelize.INTEGER,
        field: 'fog_type_id',
        references: { model: 'FogTypes', key: 'id' },
        onDelete: 'set null',
      },
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Fogs')
  },
}
