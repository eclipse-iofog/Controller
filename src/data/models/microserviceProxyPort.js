'use strict'

module.exports = (sequelize, DataTypes) => {
  const MicroserviceProxyPort = sequelize.define('MicroserviceProxyPort', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    portId: {
      type: DataTypes.INTEGER,
      field: 'port_id'
    },
    host: {
      type: DataTypes.TEXT,
      field: 'host'
    },
    localProxyId: {
      type: DataTypes.TEXT,
      field: 'local_proxy_id'
    },
    publicPort: {
      type: DataTypes.INTEGER,
      field: 'public_port'
    },
    adminPort: {
      type: DataTypes.INTEGER,
      field: 'admin_port'
    },
    protocol: {
      type: DataTypes.TEXT,
      field: 'protocol'
    }
  }, {
    tableName: 'MicroserviceProxyPorts',
    timestamps: true,
    underscored: true
  })
  MicroserviceProxyPort.associate = function (models) {
    MicroserviceProxyPort.belongsTo(models.MicroservicePort, {
      foreignKey: {
        name: 'portId',
        field: 'port_id'
      },
      as: 'port',
      onDelete: 'cascade'
    })

    MicroserviceProxyPort.hasOne(models.Microservice, {
      foreignKey: 'uuid',
      as: 'localProxy'
    })
  }

  return MicroserviceProxyPort
}
