'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = (sequelize, DataTypes) => {
  const KubeletAccessToken = sequelize.define('KubeletAccessToken', {
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
    tableName: 'KubeletAccessTokens',
    timestamps: false,
    underscored: true
  })
  KubeletAccessToken.associate = function (models) {
    KubeletAccessToken.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    })
  }
  return KubeletAccessToken
}
