'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceCdiDev = sequelize.define('MicroserviceCdiDev', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    cdiDevices: {
      type: DataTypes.TEXT,
      field: 'cdi_devices'
    }
  }, {
    tableName: 'MicroserviceCdiDevices',
    timestamps: false,
    underscored: true
  })
  MicroserviceCdiDev.associate = function (models) {
    MicroserviceCdiDev.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceCdiDev
}
