'use strict'
module.exports = (sequelize, DataTypes) => {
  const HTTPBasedResourceInterface = sequelize.define('HTTPBasedResourceInterface', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    }
  }, {
    tableName: 'HTTPBasedResourceInterfaces',
    timestamps: false,
    underscored: true
  })
  HTTPBasedResourceInterface.associate = function (models) {
    HTTPBasedResourceInterface.hasMany(models.HTTPBasedResourceInterfaceEndpoint, { as: 'endpoints', onDelete: 'cascade', foreignKey: { name: 'interfaceId', field: 'interface_id' } })
    HTTPBasedResourceInterface.belongsTo(models.EdgeResource, { foreignKey: { name: 'edgeResourceId', field: 'edge_resource_id' } })
  }
  return HTTPBasedResourceInterface
}
