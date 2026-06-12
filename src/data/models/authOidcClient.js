'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthOidcClient = sequelize.define('AuthOidcClient', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    clientId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'client_id'
    },
    secretRef: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'secret_ref'
    },
    clientType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'confidential',
      field: 'client_type',
      validate: {
        isIn: [['confidential', 'public']]
      }
    }
  }, {
    tableName: 'AuthOidcClients',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['client_id'] }
    ]
  })

  return AuthOidcClient
}
