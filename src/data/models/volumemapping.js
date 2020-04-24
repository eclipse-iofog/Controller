'use strict'
module.exports = (sequelize, DataTypes) => {
  const VolumeMapping = sequelize.define('VolumeMapping', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'uuid'
    },
    hostDestination: {
      type: DataTypes.TEXT,
      field: 'host_destination'
    },
    containerDestination: {
      type: DataTypes.TEXT,
      field: 'container_destination'
    },
    accessMode: {
      type: DataTypes.TEXT,
      field: 'access_mode'
    },
    type: {
      type: DataTypes.TEXT,
      field: 'access_mode'
    }
  }, {
    tableName: 'VolumeMappings',
    timestamps: false,
    underscored: true
  })
  VolumeMapping.associate = function (models) {
    VolumeMapping.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return VolumeMapping
}
