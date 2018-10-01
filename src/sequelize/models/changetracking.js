'use strict';
module.exports = (sequelize, DataTypes) => {
  const ChangeTracking = sequelize.define('ChangeTracking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    containerConfig: {
      type: DataTypes.BOOLEAN,
      field: 'container_config'
    },
    reboot: {
      type: DataTypes.BOOLEAN,
      field: 'reboot'
    },
    deletenode: {
      type: DataTypes.BOOLEAN,
      field: 'deletenode'
    },
    version: {
      type: DataTypes.BOOLEAN,
      field: 'version'
    },
    containerList: {
      type: DataTypes.BOOLEAN,
      field: 'container_list'
    },
    config: {
      type: DataTypes.BOOLEAN,
      field: 'config'
    },
    routing: {
      type: DataTypes.BOOLEAN,
      field: 'routing'
    },
    registries: {
      type: DataTypes.BOOLEAN,
      field: 'registries'
    },
    proxy: {
      type: DataTypes.BOOLEAN,
      field: 'proxy'
    },
    diagnostics: {
      type: DataTypes.BOOLEAN,
      field: 'diagnostics'
    },
    isImageSnapshot: {
      type: DataTypes.BOOLEAN,
      field: 'image_snapshot'
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
  ChangeTracking.associate = function(models) {
    // associations can be defined here
    ChangeTracking.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid',
      as: 'ioFogUuid',
      onDelete: 'cascade'
    });
  };
  return ChangeTracking;
};