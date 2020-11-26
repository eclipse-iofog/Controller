'use strict'
module.exports = (sequelize, DataTypes) => {
  const HTTPBasedResourceInterfaceEndpoint = sequelize.define('HTTPBasedResourceInterfaceEndpoint', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: DataTypes.TEXT,
    description: DataTypes.TEXT,
    method: DataTypes.TEXT,
    url: DataTypes.TEXT,
    requestType: DataTypes.TEXT,
    responseType: DataTypes.TEXT,
    requestPayloadExample: DataTypes.TEXT,
    responsePayloadExample: DataTypes.TEXT
  }, {
    tableName: 'HTTPBasedResourceInterfaceEndpoints',
    timestamps: false,
    underscored: true
  })
  HTTPBasedResourceInterfaceEndpoint.associate = function (models) {
    HTTPBasedResourceInterfaceEndpoint.belongsTo(models.HTTPBasedResourceInterface, { foreignKey: { name: 'interfaceId', field: 'interface_id' } })
  }
  return HTTPBasedResourceInterfaceEndpoint
}
