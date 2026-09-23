'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = (sequelize, DataTypes) => {
  const Fog = sequelize.define('Fog', {
    uuid: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false,
      field: 'uuid'
    },
    name: {
      type: DataTypes.TEXT,
      defaultValue: 'Unnamed ioFog 1',
      field: 'name'
    },
    location: {
      type: DataTypes.TEXT,
      field: 'location',
      defaultValue: ''
    },
    gpsMode: {
      type: DataTypes.TEXT,
      field: 'gps_mode'
    },
    gpsDevice: {
      type: DataTypes.TEXT,
      field: 'gps_device'
    },
    gpsScanFrequency: {
      type: DataTypes.INTEGER,
      field: 'gps_scan_frequency',
      defaultValue: 60
    },
    latitude: {
      type: DataTypes.FLOAT,
      field: 'latitude'
    },
    longitude: {
      type: DataTypes.FLOAT,
      field: 'longitude'
    },
    description: {
      type: DataTypes.TEXT,
      field: 'description',
      defaultValue: ''
    },
    lastActive: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('lastActive'), 0)
      },
      field: 'last_active'
    },
    daemonStatus: {
      type: DataTypes.TEXT,
      defaultValue: 'NOT_PROVISIONED',
      field: 'daemon_status'
    },
    daemonOperatingDuration: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('daemonOperatingDuration'))
      },
      defaultValue: 0,
      field: 'daemon_operating_duration'
    },
    daemonLastStart: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('daemonLastStart'), 0)
      },
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
    systemAvailableDisk: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('systemAvailableDisk'))
      },
      field: 'system_available_disk'
    },
    systemAvailableMemory: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('systemAvailableMemory'))
      },
      field: 'system_available_memory'
    },
    systemTotalCpu: {
      type: DataTypes.FLOAT,
      field: 'system_total_cpu'
    },
    systemCpus: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('systemCpus'))
      },
      field: 'system_cpus'
    },
    systemTotalMemory: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('systemTotalMemory'))
      },
      field: 'system_total_memory'
    },
    systemTotalDisk: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('systemTotalDisk'))
      },
      field: 'system_total_disk'
    },
    systemOs: {
      type: DataTypes.TEXT,
      field: 'system_os'
    },
    systemOsVersion: {
      type: DataTypes.TEXT,
      field: 'system_os_version'
    },
    systemKernelVersion: {
      type: DataTypes.TEXT,
      field: 'system_kernel_version'
    },
    securityStatus: {
      type: DataTypes.TEXT,
      defaultValue: 'OK',
      field: 'security_status'
    },
    securityViolationInfo: {
      type: DataTypes.TEXT,
      defaultValue: 'No violation',
      field: 'security_violation_info'
    },
    catalogItemStatus: {
      type: DataTypes.TEXT,
      field: 'catalog_item_status'
    },
    repositoryCount: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('repositoryCount'), 0)
      },
      field: 'repository_count'
    },
    repositoryStatus: {
      type: DataTypes.TEXT,
      field: 'repository_status'
    },
    systemTime: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('systemTime'), 0)
      },
      field: 'system_time'
    },
    lastStatusTime: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('lastStatusTime'), 0)
      },
      field: 'last_status_time'
    },
    ipAddress: {
      type: DataTypes.TEXT,
      defaultValue: '0.0.0.0',
      field: 'ip_address'
    },
    ipAddressExternal: {
      type: DataTypes.TEXT,
      defaultValue: '0.0.0.0',
      field: 'ip_address_external'
    },
    host: {
      type: DataTypes.TEXT
    },
    catalogItemMessageCounts: {
      type: DataTypes.TEXT,
      field: 'catalog_item_message_counts'
    },
    availableRuntimes: {
      type: DataTypes.TEXT,
      field: 'available_runtimes'
    },
    lastCommandTime: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('lastCommandTime'), 0)
      },
      field: 'last_command_time'
    },
    networkInterface: {
      type: DataTypes.TEXT,
      defaultValue: 'dynamic',
      field: 'network_interface'
    },
    containerEngineUrl: {
      type: DataTypes.TEXT,
      defaultValue: 'unix:///run/edgelet/contaienrd.sock',
      field: 'docker_url'
    },
    containerEngine: {
      type: DataTypes.ENUM('edgelet', 'docker', 'podman'),
      allowNull: false,
      field: 'container_engine',
      defaultValue: 'edgelet'
    },
    deploymentType: {
      type: DataTypes.ENUM('native', 'container'),
      allowNull: false,
      field: 'deployment_type',
      defaultValue: 'native'
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
      defaultValue: '/var/log/iofog/',
      field: 'log_directory'
    },
    logFileCount: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('logFileCount'))
      },
      defaultValue: 10,
      field: 'log_file_count'
    },
    version: {
      type: DataTypes.TEXT,
      field: 'version'
    },
    isReadyToUpgrade: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_ready_to_upgrade'
    },
    isReadyToRollback: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_ready_to_rollback'
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
    tunnel: {
      type: DataTypes.TEXT,
      defaultValue: '',
      field: 'tunnel'
    },
    watchdogEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'isolated_docker_container'
    },
    edgeGuardFrequency: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'edge_guard_frequency'
    },
    pruningFrequency: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'docker_pruning_freq'
    },
    availableDiskThreshold: {
      type: DataTypes.FLOAT,
      defaultValue: 20,
      field: 'available_disk_threshold'
    },
    logLevel: {
      type: DataTypes.TEXT,
      defaultValue: 'INFO',
      field: 'log_level'
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      field: 'is_system',
      defaultValue: false
    },
    routerId: {
      type: DataTypes.INTEGER,
      field: 'router_id',
      defaultValue: ''
    },
    timeZone: {
      type: DataTypes.TEXT,
      field: 'time_zone'
    },
    activeVolumeMounts: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      get () {
        return convertToInt(this.getDataValue('activeVolumeMounts'), 0)
      },
      field: 'active_volume_mounts'
    },
    volumeMountLastUpdate: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('volumeMountLastUpdate'), 0)
      },
      field: 'volume_mount_last_update'
    },
    modelStatus: {
      type: DataTypes.TEXT,
      field: 'model_status'
    },
    runtimeClasses: {
      type: DataTypes.TEXT,
      field: 'runtime_classes'
    },
    availableCdiDevices: {
      type: DataTypes.TEXT,
      field: 'available_cdi_devices'
    },
    activeModels: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      get () {
        return convertToInt(this.getDataValue('activeModels'), 0)
      },
      field: 'active_models'
    },
    modelLastUpdate: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('modelLastUpdate'), 0)
      },
      field: 'model_last_update'
    },
    knowledgeStatus: {
      type: DataTypes.TEXT,
      field: 'knowledge_status'
    },
    activeKnowledge: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      get () {
        return convertToInt(this.getDataValue('activeKnowledge'), 0)
      },
      field: 'active_knowledge'
    },
    knowledgeLastUpdate: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('knowledgeLastUpdate'), 0)
      },
      field: 'knowledge_last_update'
    },
    warningMessage: {
      type: DataTypes.TEXT,
      field: 'warning_message',
      defaultValue: 'HEALTHY'
    },
    gpsStatus: {
      type: DataTypes.TEXT,
      field: 'gps_status'
    },
    archId: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'arch_id'
    }
  }, {
    tableName: 'Fogs',
    timestamps: true,
    underscored: true
  })
  Fog.associate = function (models) {
    Fog.belongsTo(models.Architecture, {
      foreignKey: {
        name: 'archId',
        field: 'arch_id'
      },
      as: 'architecture',
      defaultValue: 0
    })

    Fog.hasOne(models.FogPublicKey, {
      foreignKey: 'iofog_uuid',
      as: 'publicKey'
    })

    Fog.hasMany(models.Microservice, {
      foreignKey: 'iofog_uuid',
      as: 'microservice'
    })

    Fog.hasMany(models.FogUsedToken, {
      foreignKey: 'iofog_uuid',
      as: 'jti'
    })

    Fog.hasOne(models.Router, {
      foreignKey: 'iofog_uuid',
      as: 'router'
    })

    Fog.hasOne(models.NatsInstance, {
      foreignKey: 'iofog_uuid',
      as: 'nats'
    })

    Fog.hasOne(models.FogPlatformSpec, {
      foreignKey: 'fog_uuid',
      as: 'platformSpec'
    })

    Fog.hasOne(models.FogPlatformStatus, {
      foreignKey: 'fog_uuid',
      as: 'platformStatus'
    })

    Fog.belongsToMany(models.Tags, { through: 'IofogTags', as: 'tags' })
    Fog.belongsToMany(models.VolumeMount, { through: 'FogVolumeMounts', as: 'volumeMounts' })
    Fog.belongsToMany(models.FleetModel, {
      through: models.FogModels,
      as: 'models',
      foreignKey: 'fog_uuid',
      otherKey: 'model_uuid'
    })
    Fog.belongsToMany(models.FleetKnowledge, {
      through: models.FogKnowledge,
      as: 'knowledge',
      foreignKey: 'fog_uuid',
      otherKey: 'knowledge_uuid'
    })
    Fog.belongsToMany(models.RuntimeClass, {
      through: models.FogRuntimeClasses,
      as: 'runtimeClassLinks',
      foreignKey: 'fog_uuid',
      otherKey: 'runtime_class_name'
    })
  }

  return Fog
}
