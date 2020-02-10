'use strict'

module.exports = (sequelize, DataTypes) => {
  const MicroservicePublicPort = sequelize.define('MicroservicePublicPort', {
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
    hostId: {
      type: DataTypes.TEXT,
      field: 'host_id'
    },
    localProxyId: {
      type: DataTypes.TEXT,
      field: 'local_proxy_id'
    },
    remoteProxyId: {
      type: DataTypes.TEXT,
      field: 'remote_proxy_id'
    },
    publicPort: {
      type: DataTypes.INTEGER,
      field: 'public_port'
    },
    queueName: {
      type: DataTypes.TEXT,
      field: 'queue_name'
    }
  }, {
    tableName: 'MicroservicePublicPorts',
    timestamps: true,
    underscored: true
  })
  MicroservicePublicPort.associate = function (models) {
    MicroservicePublicPort.belongsTo(models.MicroservicePort, {
      foreignKey: {
        name: 'portId',
        field: 'port_id'
      },
      as: 'port',
      onDelete: 'cascade'
    })

    MicroservicePublicPort.belongsTo(models.Fog, {
      foreignKey: {
        name: 'hostId',
        field: 'host_id'
      },
      as: 'host',
      onDelete: 'cascade'
    })

    MicroservicePublicPort.hasOne(models.Microservice, {
      foreignKey: 'uuid',
      as: 'localProxy'
    })

    MicroservicePublicPort.hasOne(models.Microservice, {
      foreignKey: 'uuid',
      as: 'remoteProxy'
    })
  }

  return MicroservicePublicPort
}
