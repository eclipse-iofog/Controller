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
  }
  return MicroservicePort
}
