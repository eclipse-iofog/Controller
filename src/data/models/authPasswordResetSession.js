'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthPasswordResetSession = sequelize.define('AuthPasswordResetSession', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false,
      field: 'id'
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    }
  }, {
    tableName: 'AuthPasswordResetSessions',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['expires_at'] }
    ]
  })

  AuthPasswordResetSession.associate = function (models) {
    AuthPasswordResetSession.belongsTo(models.AuthUser, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'CASCADE'
    })
  }

  return AuthPasswordResetSession
}
