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
      field: 'container_config',
      defaultValue: false
    },
    reboot: {
      type: DataTypes.BOOLEAN,
      field: 'reboot',
      defaultValue: false
    },
    deleteNode: {
      type: DataTypes.BOOLEAN,
      field: 'deletenode',
      defaultValue: false
    },
    version: {
      type: DataTypes.BOOLEAN,
      field: 'version',
      defaultValue: false
    },
    containerList: {
      type: DataTypes.BOOLEAN,
      field: 'container_list',
      defaultValue: false
    },
    config: {
      type: DataTypes.BOOLEAN,
      field: 'config',
      defaultValue: false
    },
    routing: {
      type: DataTypes.BOOLEAN,
      field: 'routing',
      defaultValue: false
    },
    registries: {
      type: DataTypes.BOOLEAN,
      field: 'registries',
      defaultValue: false
    },
    tunnel: {
      type: DataTypes.BOOLEAN,
      field: 'tunnel',
      defaultValue: false
    },
    diagnostics: {
      type: DataTypes.BOOLEAN,
      field: 'diagnostics',
      defaultValue: false
    },
    isImageSnapshot: {
      type: DataTypes.BOOLEAN,
      field: 'image_snapshot',
      defaultValue: false
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