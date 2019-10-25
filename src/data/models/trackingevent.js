'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = (sequelize, DataTypes) => {
  const TrackingEvent = sequelize.define('TrackingEvent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    uuid: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'uuid'
    },
    sourceType: {
      type: DataTypes.TEXT,
      field: 'source_type'
    },
    timestamp: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('timestamp'))
      },
      field: 'timestamp'
    },
    type: {
      type: DataTypes.TEXT,
      field: 'type'
    },
    data: {
      type: DataTypes.TEXT,
      field: 'data'
    }
  }, {
    tableName: 'TrackingEvents',
    timestamps: false,
    underscored: true
  })
  TrackingEvent.associate = function (models) {
    // associations can be defined here
  }
  return TrackingEvent
}
