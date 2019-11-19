'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = (sequelize, DataTypes) => {
  const EmailActivationCode = sequelize.define('EmailActivationCode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    activationCode: {
      type: DataTypes.TEXT,
      field: 'activation_code'
    },
    expirationTime: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('expirationTime'))
      },
      field: 'expiration_time'
    }
  }, {
    tableName: 'EmailActivationCodes',
    timestamps: false,
    underscored: true
  })
  EmailActivationCode.associate = function (models) {
    EmailActivationCode.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    })
  }
  return EmailActivationCode
}
