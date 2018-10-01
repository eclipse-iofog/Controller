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
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  MicroserviceStatus.associate = function(models) {
    // associations can be defined here
    MicroserviceStatus.belongsTo(models.Microservice, {
      foreignKey: 'microservice_uuid',
      as: 'microserviceUuid',
      onDelete: 'cascade'
    });
  };
  return MicroserviceStatus;
};