'use strict';
module.exports = (sequelize, DataTypes) => {
  const Microservice = sequelize.define('Microservice', {
    uuid: {
      type: DataTypes.TEXT,
      primaryKey: true,
      allowNull: false,
      field: 'uuid'
    },
    config: {
      type: DataTypes.TEXT,
      field: 'config',
      defaultValue: ""
    },
    name: {
      type: DataTypes.TEXT,
      field: 'name',
      defaultValue: "New Microservice"
    },
    configLastUpdated: {
      type: DataTypes.BIGINT,
      field: 'config_last_updated'
    },
    isNetwork: {
      type: DataTypes.BOOLEAN,
      field: 'is_network',
      defaultValue: false
    },
    needUpdate: {
      type: DataTypes.BOOLEAN,
      field: 'need_update',
      defaultValue: false
    },
    rebuild: {
      type: DataTypes.BOOLEAN,
      field: 'rebuild',
      defaultValue: false
    },
    rootHostAccess: {
      type: DataTypes.BOOLEAN,
      field: 'root_host_access',
      defaultValue: false
    },
    logSize: {
      type: DataTypes.BIGINT,
      field: 'log_size',
      defaultValue: 0
    },
    imageSnapshot: {
      type: DataTypes.TEXT,
      field: 'image_snapshot',
      defaultValue: ""
    },
    deleteWithCleanUp: {
      type: DataTypes.BOOLEAN,
      field: 'delete_with_cleanup',
      defaultValue: false
    }
  }, {
    timestamps: true,
    underscored: true
  });
  Microservice.associate = function (models) {

    Microservice.belongsTo(models.CatalogItem, {
      foreignKey: {
        name: 'catalogItemId',
        field: 'catalog_item_id'
      },
      as: 'catalogItem',
      onDelete: 'cascade'

    });

    Microservice.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'set null'
    });

    Microservice.belongsTo(models.Registry, {
      foreignKey: {
        name: 'registryId',
        field: 'registry_id'
      },
      as: 'registry',
      onDelete: 'cascade'
    });

    Microservice.belongsTo(models.Flow, {
      foreignKey: {
        name: 'flowId',
        field: 'flow_id'
      },
      as: 'flow',
      onDelete: 'cascade'
    });

    Microservice.belongsTo(models.User, {
      foreignKey: {
        name: 'updatedBy',
        field: 'updated_by'
      },
      as: 'userUpdatedBy',
      onDelete: 'cascade'
    });

    Microservice.hasOne(models.MicroservicePort, {
      foreignKey: 'microservice_uuid',
      as: 'ports'
    });

    Microservice.hasMany(models.VolumeMapping, {
      foreignKey: 'microservice_uuid',
      as: 'volumeMappings'
    });

    Microservice.hasMany(models.StraceDiagnostics, {
      foreignKey: 'microservice_uuid',
      as: 'strace'
    });
  };
  return Microservice;
};