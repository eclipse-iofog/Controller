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
    deleteNode: {
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
    timestamps: false,
    underscored: true
  });
  ChangeTracking.associate = function (models) {

    ChangeTracking.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'cascade'
    });
  };
  return ChangeTracking;
};