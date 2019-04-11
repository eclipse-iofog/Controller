'use strict'
module.exports = (sequelize, DataTypes) => {
  const Microservice = sequelize.define('Microservice', {
    uuid: {
      type: DataTypes.TEXT,
      primaryKey: true,
      allowNull: false,
      field: 'uuid',
    },
    config: {
      type: DataTypes.TEXT,
      field: 'config',
      defaultValue: '{}',
    },
    name: {
      type: DataTypes.TEXT,
      field: 'name',
      defaultValue: 'New Microservice',
    },
    configLastUpdated: {
      type: DataTypes.BIGINT,
      field: 'config_last_updated',
    },
    isNetwork: {
      type: DataTypes.BOOLEAN,
      field: 'is_network',
      defaultValue: false,
    },
    rebuild: {
      type: DataTypes.BOOLEAN,
      field: 'rebuild',
      defaultValue: false,
    },
    rootHostAccess: {
      type: DataTypes.BOOLEAN,
      field: 'root_host_access',
      defaultValue: false,
    },
    logSize: {
      type: DataTypes.BIGINT,
      field: 'log_size',
      defaultValue: 0,
    },
    imageSnapshot: {
      type: DataTypes.TEXT,
      field: 'image_snapshot',
      defaultValue: '',
    },
    delete: {
      type: DataTypes.BOOLEAN,
      field: 'delete',
      defaultValue: false,
    },
    deleteWithCleanup: {
      type: DataTypes.BOOLEAN,
      field: 'delete_with_cleanup',
      defaultValue: false,
    },
  }, {
    timestamps: true,
    underscored: true,
  })
  Microservice.associate = function(models) {
    Microservice.belongsTo(models.CatalogItem, {
      foreignKey: {
        name: 'catalogItemId',
        field: 'catalog_item_id',
      },
      as: 'catalogItem',
      onDelete: 'cascade',

    })

    Microservice.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid',
      },
      as: 'iofog',
      onDelete: 'set null',
    })

    Microservice.belongsTo(models.Flow, {
      foreignKey: {
        name: 'flowId',
        field: 'flow_id',
      },
      as: 'flow',
      onDelete: 'cascade',
    })

    Microservice.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id',
      },
      as: 'user',
      onDelete: 'cascade',
    })

    Microservice.hasMany(models.MicroservicePort, {
      foreignKey: 'microservice_uuid',
      as: 'ports',
    })

    Microservice.hasMany(models.VolumeMapping, {
      foreignKey: 'microservice_uuid',
      as: 'volumeMappings',
    })

    Microservice.hasOne(models.StraceDiagnostics, {
      foreignKey: 'microservice_uuid',
      as: 'strace',
    })

    Microservice.hasMany(models.Routing, {
      foreignKey: 'source_microservice_uuid',
      as: 'routes',
    })

    Microservice.hasOne(models.MicroserviceStatus, {
      foreignKey: 'microservice_uuid',
      as: 'microserviceStatus',
    })

    Microservice.hasMany(models.MicroserviceEnv, {
      foreignKey: 'microservice_uuid',
      as: 'env',
    })

    Microservice.hasMany(models.MicroserviceArg, {
      foreignKey: 'microservice_uuid',
      as: 'arg',
    })
  }

  return Microservice
}
