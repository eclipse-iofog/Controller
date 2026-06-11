'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthRefreshToken = sequelize.define('AuthRefreshToken', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'token_hash'
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id'
    },
    familyId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'family_id'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'revoked'
    }
  }, {
    tableName: 'AuthRefreshTokens',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['token_hash'] },
      { fields: ['user_id'] },
      { fields: ['family_id'] },
      { fields: ['expires_at'] }
    ]
  })

  AuthRefreshToken.associate = function (models) {
    AuthRefreshToken.belongsTo(models.AuthUser, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'CASCADE'
    })
  }

  return AuthRefreshToken
}
