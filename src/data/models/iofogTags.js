'use strict'
module.exports = (sequelize, DataTypes) => {
  const IofogTags = sequelize.define('IofogTags', {}, {
    tableName: 'IofogTags',
    timestamps: false,
    underscored: true
  })
  return IofogTags
}
