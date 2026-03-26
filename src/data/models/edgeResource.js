'use strict'
module.exports = (sequelize, DataTypes) => {
  const EdgeResource = sequelize.define('EdgeResource', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    version: DataTypes.TEXT,
    description: DataTypes.TEXT,
    displayName: DataTypes.TEXT,
    displayColor: DataTypes.TEXT,
    displayIcon: DataTypes.TEXT,
    interfaceProtocol: DataTypes.TEXT,
    interfaceId: { type: DataTypes.INTEGER, field: 'interface_id' }, // Reference external document depending on the value of interfaceProtocol
    custom: DataTypes.TEXT
  }, {
    tableName: 'EdgeResources',
    timestamps: false,
    underscored: true
  })
  EdgeResource.associate = function (models) {
    EdgeResource.belongsToMany(models.Fog, { through: 'AgentEdgeResources', as: 'agents' })
    EdgeResource.belongsToMany(models.Tags, { as: 'orchestrationTags', through: 'EdgeResourceOrchestrationTags' })
  }
  return EdgeResource
}
