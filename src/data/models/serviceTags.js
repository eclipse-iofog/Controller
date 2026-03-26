'use strict'
module.exports = (sequelize, DataTypes) => {
  const ServiceTags = sequelize.define('ServiceTags', {}, {
    tableName: 'ServiceTags',
    timestamps: false,
    underscored: true
  })
  return ServiceTags
}
