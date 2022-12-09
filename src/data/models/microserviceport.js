'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroservicePort = sequelize.define('MicroservicePort', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    portInternal: {
      type: DataTypes.INTEGER,
      field: 'port_internal'
    },
    portExternal: {
      type: DataTypes.INTEGER,
      field: 'port_external'
    },
    isUdp: {
      type: DataTypes.BOOLEAN,
      field: 'is_udp'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      field: 'is_public'
    },
    isProxy: {
      type: DataTypes.BOOLEAN,
      field: 'is_proxy'
    }
  }, {
    tableName: 'MicroservicePorts',
    timestamps: true,
    underscored: true
  })
  MicroservicePort.associate = function (models) {
    MicroservicePort.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })

    MicroservicePort.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    })

    MicroservicePort.hasOne(models.MicroservicePublicPort, {
      foreignKey: 'port_id',
      as: 'publicPort'
    })

    MicroservicePort.hasOne(models.MicroserviceProxyPort, {
      foreignKey: 'port_id',
      as: 'proxyPort'
    })
  }
  return MicroservicePort
}
