'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthBffSession = sequelize.define('AuthBffSession', {
    sid: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false,
      field: 'sid'
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'data'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    }
  }, {
    tableName: 'AuthBffSessions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['expires_at'] }
    ]
  })

  return AuthBffSession
}
