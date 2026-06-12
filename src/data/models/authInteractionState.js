'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthInteractionState = sequelize.define('AuthInteractionState', {
    uid: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false,
      field: 'uid'
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'payload'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    }
  }, {
    tableName: 'AuthInteractionStates',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['expires_at'] }
    ]
  })

  return AuthInteractionState
}
