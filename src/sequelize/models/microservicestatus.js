'use strict';
module.exports = (sequelize, DataTypes) => {
  const MicroserviceStatus = sequelize.define('MicroserviceStatus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    status: {
      type: DataTypes.TEXT,
      field: 'status'
    },
    cpuUsage: {
      type: DataTypes.FLOAT,
      defaultValue: 0.000,
      field: 'cpu_usage'
    },
    memoryUsage: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'memory_usage'
    },
    containerId: {
      type: DataTypes.TEXT,
      field: 'container_id'
    }
  }, {
    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,
    underscored: true
  });
  MicroserviceStatus.associate = function(models) {

    MicroserviceStatus.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    });
  };
  return MicroserviceStatus;
};