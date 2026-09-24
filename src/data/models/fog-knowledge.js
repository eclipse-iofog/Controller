'use strict'

module.exports = (sequelize, DataTypes) => {
  const FogKnowledge = sequelize.define('FogKnowledge', {}, {
    tableName: 'FogKnowledge',
    timestamps: false,
    underscored: true
  })
  return FogKnowledge
}
