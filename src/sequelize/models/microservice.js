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
      field: 'config'
    },
    name: {
      type: DataTypes.TEXT,
      field: 'name'
    },
    configLastUpdated: {
      type: DataTypes.BIGINT,
      field: 'config_last_updated'
    },
    isNetwork: {
      type: DataTypes.BOOLEAN,
      field: 'is_network'
    },
    needUpdate: {
      type: DataTypes.BOOLEAN,
      field: 'need_update'
    },
    rebuild: {
      type: DataTypes.BOOLEAN,
      field: 'rebuild'
    },
    rootHostAccess: {
      type: DataTypes.BOOLEAN,
      field: 'root_host_access'
    },
    logSize: {
      type: DataTypes.BIGINT,
      field: 'log_size'
    },
    imageSnapshot: {
      type: DataTypes.TEXT,
      field: 'image_snapshot'
    },
    deleteWithCleanUp: {
      type: DataTypes.BOOLEAN,
      field: 'delete_with_cleanup'
    }
  }, {
    timestamps: true,
    underscored: true
  });
  Microservice.associate = function(models) {

    Microservice.belongsTo(models.CatalogItem, {
      foreignKey: 'catalog_item_id',
      as: 'catalogItemId',
      onDelete: 'cascade'

    });

    Microservice.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid',
      as: 'iofoguuid',
      onDelete: 'set null'
    });

    Microservice.belongsTo(models.Registry, {
      foreignKey: 'registry_id',
      as: 'registryId',
      onDelete: 'cascade'
    });

    Microservice.belongsTo(models.Flow, {
      foreignKey: 'flow_id',
      as: 'flowId',
      onDelete: 'cascade'
    });

    Microservice.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'UpdatedBy',
      onDelete: 'cascade'
    });
  };
  return Microservice;
};