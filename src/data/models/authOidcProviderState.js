'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthOidcProviderState = sequelize.define('AuthOidcProviderState', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    model: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'model'
    },
    recordId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'record_id'
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'payload'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    grantId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'grant_id'
    },
    uid: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'uid'
    },
    userCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'user_code'
    },
    consumed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'consumed'
    },
    consumedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'consumed_at'
    }
  }, {
    tableName: 'AuthOidcProviderStates',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['model', 'record_id'] },
      { fields: ['grant_id'] },
      { fields: ['uid'] },
      { fields: ['user_code'] },
      { fields: ['expires_at'] }
    ]
  })

  return AuthOidcProviderState
}
