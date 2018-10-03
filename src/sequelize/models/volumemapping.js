'use strict';
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
    }
  }, {
    timestamps: false,
    underscored: true
  });
  VolumeMapping.associate = function(models) {

    VolumeMapping.belongsTo(models.Microservice, {
      foreignKey: 'microservice_uuid',
      as: 'microserviceUuid',
      onDelete: 'cascade'
    });
  };
  return VolumeMapping;
};

