'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceDevice = sequelize.define('MicroserviceDevice', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    hostPath: {
      type: DataTypes.TEXT,
      field: 'host_path'
    },
    containerPath: {
      type: DataTypes.TEXT,
      field: 'container_path'
    },
    permissions: {
      type: DataTypes.TEXT,
      field: 'permissions'
    }
  }, {
    tableName: 'MicroserviceDevices',
    timestamps: false,
    underscored: true
  })
  MicroserviceDevice.associate = function (models) {
    MicroserviceDevice.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceDevice
}
