'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthUser = sequelize.define('AuthUser', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false,
      field: 'id'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'email'
    },
    passwordHash: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'password_hash'
    },
    passwordHistoryHashes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'password_history_hashes'
    },
    mustChangePassword: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'must_change_password'
    },
    isBootstrap: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_bootstrap'
    },
    failedAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'failed_attempts'
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_until'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  }, {
    tableName: 'AuthUsers',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['email'] },
      { fields: ['deleted_at'] }
    ]
  })

  AuthUser.associate = function (models) {
    AuthUser.belongsToMany(models.AuthGroup, {
      through: models.AuthUserGroup,
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      otherKey: {
        name: 'groupId',
        field: 'group_id'
      },
      as: 'groups'
    })
    AuthUser.hasOne(models.AuthMfa, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'mfa',
      onDelete: 'CASCADE'
    })
    AuthUser.hasMany(models.AuthRefreshToken, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'refreshTokens',
      onDelete: 'CASCADE'
    })
    AuthUser.hasMany(models.AuthPasswordResetSession, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'passwordResetSessions',
      onDelete: 'CASCADE'
    })
  }

  return AuthUser
}
