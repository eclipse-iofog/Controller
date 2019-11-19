'use strict'

const { convertToInt } = require('../../helpers/app-helper')
const microserviceState = require('../../enums/microservice-state')

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
      defaultValue: microserviceState.QUEUED,
      field: 'status'
    },
    operatingDuration: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('operatingDuration'))
      },
      defaultValue: 0,
      field: 'operating_duration'
    },
    startTime: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('startTime'))
      },
      defaultValue: 0,
      field: 'start_time'
    },
    cpuUsage: {
      type: DataTypes.FLOAT,
      defaultValue: 0.000,
      field: 'cpu_usage'
    },
    memoryUsage: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('memoryUsage'))
      },
      defaultValue: 0,
      field: 'memory_usage'
    },
    containerId: {
      type: DataTypes.TEXT,
      defaultValue: '',
      field: 'container_id'
    }
  }, {
    tableName: 'MicroserviceStatuses',
    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,
    underscored: true
  })
  MicroserviceStatus.associate = function (models) {
    MicroserviceStatus.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceStatus
}
