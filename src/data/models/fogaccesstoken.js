'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = (sequelize, DataTypes) => {
  const FogAccessToken = sequelize.define('FogAccessToken', {
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
    tableName: 'FogAccessTokens',
    timestamps: false,
    underscored: true
  })
  FogAccessToken.associate = function (models) {
    FogAccessToken.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    })

    FogAccessToken.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'cascade'
    })
  }
  return FogAccessToken
}
