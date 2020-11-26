'use strict'
module.exports = (sequelize, DataTypes) => {
  const AgentEdgeResources = sequelize.define('AgentEdgeResources', {}, {
    tableName: 'AgentEdgeResources',
    timestamps: false,
    underscored: true
  })
  return AgentEdgeResources
}
