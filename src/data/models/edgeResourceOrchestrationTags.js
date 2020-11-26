'use strict'
module.exports = (sequelize, DataTypes) => {
  const EdgeResourceOrchestrationTags = sequelize.define('EdgeResourceOrchestrationTags', {}, {
    tableName: 'EdgeResourceOrchestrationTags',
    timestamps: false,
    underscored: true
  })
  return EdgeResourceOrchestrationTags
}
