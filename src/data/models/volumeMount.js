'use strict'

module.exports = (sequelize, DataTypes) => {
  const VolumeMount = sequelize.define('VolumeMount', {
    uuid: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false,
      field: 'uuid'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'name'
    },
    configMapName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'config_map_name'
    },
    secretName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'secret_name'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'version'
    }
  }, {
    tableName: 'VolumeMounts',
    timestamps: true,
    underscored: true
  })

  VolumeMount.associate = function (models) {
    VolumeMount.belongsToMany(models.Fog, { through: 'FogVolumeMounts', as: 'fogs' })
  }

  return VolumeMount
}
