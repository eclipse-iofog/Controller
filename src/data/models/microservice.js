'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = (sequelize, DataTypes) => {
  const Microservice = sequelize.define('Microservice', {
    uuid: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false,
      field: 'uuid'
    },
    config: {
      type: DataTypes.TEXT,
      field: 'config',
      defaultValue: '{}'
    },
    annotations: {
      type: DataTypes.TEXT,
      field: 'annotations',
      defaultValue: '{}'
    },
    name: {
      type: DataTypes.TEXT,
      field: 'name',
      defaultValue: 'New Microservice'
    },
    configLastUpdated: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('configLastUpdated'))
      },
      field: 'config_last_updated'
    },
    rebuild: {
      type: DataTypes.BOOLEAN,
      field: 'rebuild',
      defaultValue: false
    },
    hostNetworkMode: {
      type: DataTypes.BOOLEAN,
      field: 'host_network_mode',
      defaultValue: false
    },
    isPrivileged: {
      type: DataTypes.BOOLEAN,
      field: 'is_privileged',
      defaultValue: false
    },
    runAsUser: {
      type: DataTypes.TEXT,
      field: 'run_as_user',
      defaultValue: ''
    },
    platform: {
      type: DataTypes.TEXT,
      field: 'platform',
      defaultValue: ''
    },
    runtime: {
      type: DataTypes.TEXT,
      field: 'runtime',
      defaultValue: ''
    },
    logSize: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('logSize'))
      },
      field: 'log_size',
      defaultValue: 0
    },
    pidMode: {
      type: DataTypes.TEXT,
      field: 'pid_mode',
      defaultValue: ''
    },
    ipcMode: {
      type: DataTypes.TEXT,
      field: 'ipc_mode',
      defaultValue: ''
    },
    schedule: {
      type: DataTypes.INTEGER,
      field: 'schedule',
      defaultValue: 50
    },
    cpuSetCpus: {
      type: DataTypes.TEXT,
      field: 'cpu_set_cpus',
      defaultValue: ''
    },
    memoryLimit: {
      type: DataTypes.FLOAT,
      field: 'memory_limit'
    },
    imageSnapshot: {
      type: DataTypes.TEXT,
      field: 'image_snapshot',
      defaultValue: ''
    },
    execEnabled: {
      type: DataTypes.BOOLEAN,
      field: 'exec_enabled',
      defaultValue: false
    },
    delete: {
      type: DataTypes.BOOLEAN,
      field: 'delete',
      defaultValue: false
    },
    deleteWithCleanup: {
      type: DataTypes.BOOLEAN,
      field: 'delete_with_cleanup',
      defaultValue: false
    },
    isActivated: {
      type: DataTypes.BOOLEAN,
      field: 'is_activated',
      defaultValue: true
    },
    natsAccess: {
      type: DataTypes.BOOLEAN,
      field: 'nats_access',
      defaultValue: false
    },
    natsAccountId: {
      type: DataTypes.INTEGER,
      field: 'nats_account_id',
      allowNull: true
    },
    natsUserId: {
      type: DataTypes.INTEGER,
      field: 'nats_user_id',
      allowNull: true
    },
    natsCredsSecretName: {
      type: DataTypes.TEXT,
      field: 'nats_creds_secret_name',
      allowNull: true
    },
    natsRuleId: {
      type: DataTypes.INTEGER,
      field: 'nats_rule_id',
      allowNull: true
    }
  }, {
    tableName: 'Microservices',
    timestamps: true,
    underscored: true
  })
  Microservice.associate = function (models) {
    Microservice.belongsTo(models.CatalogItem, {
      foreignKey: {
        name: 'catalogItemId',
        field: 'catalog_item_id'
      },
      as: 'catalogItem',
      onDelete: 'cascade'
    })

    Microservice.belongsTo(models.Registry, {
      foreignKey: {
        name: 'registryId',
        field: 'registry_id'
      },
      as: 'registry',
      onDelete: 'cascade',
      defaultValue: 1
    })

    Microservice.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'set null'
    })

    Microservice.belongsTo(models.Application, {
      foreignKey: {
        name: 'applicationId',
        field: 'application_id'
      },
      as: 'application',
      onDelete: 'cascade'
    })

    Microservice.hasMany(models.CatalogItemImage, {
      foreignKey: 'microservice_uuid',
      as: 'images'
    })

    Microservice.hasMany(models.MicroservicePort, {
      foreignKey: 'microservice_uuid',
      as: 'ports'
    })

    Microservice.hasMany(models.VolumeMapping, {
      foreignKey: 'microservice_uuid',
      as: 'volumeMappings'
    })

    Microservice.hasOne(models.StraceDiagnostics, {
      foreignKey: 'microservice_uuid',
      as: 'strace'
    })

    Microservice.hasOne(models.MicroserviceStatus, {
      foreignKey: 'microservice_uuid',
      as: 'microserviceStatus'
    })

    Microservice.hasOne(models.MicroserviceExecStatus, {
      foreignKey: 'microservice_uuid',
      as: 'microserviceExecStatus'
    })

    Microservice.hasOne(models.MicroserviceHealthCheck, {
      foreignKey: 'microservice_uuid',
      as: 'healthCheck'
    })

    Microservice.hasMany(models.MicroserviceEnv, {
      foreignKey: 'microservice_uuid',
      as: 'env'
    })

    Microservice.hasMany(models.MicroserviceArg, {
      foreignKey: 'microservice_uuid',
      as: 'cmd'
    })

    Microservice.hasMany(models.MicroserviceCdiDev, {
      foreignKey: 'microservice_uuid',
      as: 'cdiDevices'
    })

    Microservice.hasMany(models.MicroserviceCapAdd, {
      foreignKey: 'microservice_uuid',
      as: 'capAdd'
    })

    Microservice.hasMany(models.MicroserviceCapDrop, {
      foreignKey: 'microservice_uuid',
      as: 'capDrop'
    })

    Microservice.hasMany(models.MicroserviceExtraHost, {
      foreignKey: 'microservice_uuid',
      as: 'extraHosts'
    })

    Microservice.hasOne(models.RbacServiceAccount, {
      foreignKey: 'microservice_uuid',
      as: 'serviceAccount',
      onDelete: 'cascade'
    })

    Microservice.belongsTo(models.NatsAccount, {
      foreignKey: {
        name: 'natsAccountId',
        field: 'nats_account_id'
      },
      as: 'natsAccount'
    })

    Microservice.belongsTo(models.NatsUser, {
      foreignKey: {
        name: 'natsUserId',
        field: 'nats_user_id'
      },
      as: 'natsUser'
    })

    Microservice.belongsTo(models.NatsUserRule, {
      foreignKey: {
        name: 'natsRuleId',
        field: 'nats_rule_id'
      },
      as: 'natsRule',
      onDelete: 'set null'
    })
  }

  return Microservice
}
