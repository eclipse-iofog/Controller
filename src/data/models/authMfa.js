'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthMfa = sequelize.define('AuthMfa', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
      field: 'user_id'
    },
    totpSecretEncrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'totp_secret_encrypted'
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'enabled'
    },
    recoveryCodesHash: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'recovery_codes_hash'
    }
  }, {
    tableName: 'AuthMfa',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id'] }
    ]
  })

  AuthMfa.associate = function (models) {
    AuthMfa.belongsTo(models.AuthUser, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'CASCADE'
    })
  }

  return AuthMfa
}
