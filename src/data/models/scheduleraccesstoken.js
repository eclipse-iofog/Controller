'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = (sequelize, DataTypes) => {
  const SchedulerAccessToken = sequelize.define('SchedulerAccessToken', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    expirationTime: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('expirationTime'))
      },
      field: 'expiration_time'
    },
    token: {
      type: DataTypes.TEXT,
      field: 'token'
    }
  }, {
    timestamps: false,
    underscored: true
  })
  SchedulerAccessToken.associate = function (models) {
    SchedulerAccessToken.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    })
  }
  return SchedulerAccessToken
}
