'use strict'
module.exports = (sequelize, DataTypes) => {
  const FogVolumeMounts = sequelize.define('FogVolumeMounts', {}, {
    tableName: 'FogVolumeMounts',
    timestamps: false,
    underscored: true
  })
  return FogVolumeMounts
}
