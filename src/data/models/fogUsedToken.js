'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = (sequelize, DataTypes) => {
  const FogUsedToken = sequelize.define('FogUsedToken', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    jti: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false
    },
    expiryTime: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('expiryTime'), 0)
      },
      set (value) {
        // Ensure the value is stored as a BIGINT (Unix timestamp)
        this.setDataValue('expiryTime', parseInt(value, 10))
      },
      field: 'expiry_time'
    }
  }, {
    tableName: 'FogUsedTokens',
    timestamps: true,
    underscored: true
  })
  FogUsedToken.associate = function (models) {
    FogUsedToken.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'cascade'
    })
  }
  return FogUsedToken
}
