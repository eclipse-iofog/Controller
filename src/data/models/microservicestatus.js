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
    },
    percentage: {
      type: DataTypes.FLOAT,
      defaultValue: 0.00,
      field: 'percentage'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      defaultValue: '',
      field: 'error_message'
    },
    ipAddress: {
      type: DataTypes.TEXT,
      defaultValue: '',
      field: 'ip_address'
    },
    healthStatus: {
      type: DataTypes.TEXT,
      defaultValue: '',
      field: 'health_status'
    },
    execSessionIds: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      field: 'exec_session_ids',
      get () {
        const value = this.getDataValue('execSessionIds')
        try {
          return JSON.parse(value)
        } catch (e) {
          return []
        }
      },
      set (value) {
        this.setDataValue('execSessionIds', JSON.stringify(value))
      }
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
