'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthPolicy = sequelize.define('AuthPolicy', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      defaultValue: 1,
      field: 'id'
    },
    minPasswordLength: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 12,
      field: 'min_password_length'
    },
    requireUppercase: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'require_uppercase'
    },
    requireLowercase: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'require_lowercase'
    },
    requireDigit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'require_digit'
    },
    passwordMaxAgeDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'password_max_age_days'
    },
    passwordHistoryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      field: 'password_history_count'
    },
    maxFailedAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      field: 'max_failed_attempts'
    },
    lockoutDurationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      field: 'lockout_duration_minutes'
    },
    accessTokenTtlSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 900,
      field: 'access_token_ttl_seconds'
    },
    refreshTokenTtlSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 604800,
      field: 'refresh_token_ttl_seconds'
    },
    refreshRotation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'refresh_rotation'
    },
    maxConcurrentSessions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_concurrent_sessions'
    }
  }, {
    tableName: 'AuthPolicy',
    timestamps: true,
    underscored: true
  })

  return AuthPolicy
}
