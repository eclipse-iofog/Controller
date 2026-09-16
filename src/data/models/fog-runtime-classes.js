'use strict'

module.exports = (sequelize, DataTypes) => {
  const FogRuntimeClasses = sequelize.define('FogRuntimeClasses', {}, {
    tableName: 'FogRuntimeClasses',
    timestamps: false,
    underscored: true
  })
  return FogRuntimeClasses
}
