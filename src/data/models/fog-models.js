'use strict'

module.exports = (sequelize, DataTypes) => {
  const FogModels = sequelize.define('FogModels', {}, {
    tableName: 'FogModels',
    timestamps: false,
    underscored: true
  })
  return FogModels
}
