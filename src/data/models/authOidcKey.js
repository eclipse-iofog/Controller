'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthOidcKey = sequelize.define('AuthOidcKey', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    kid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'kid'
    },
    keyMaterialEncrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'key_material_encrypted'
    },
    vaultRef: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'vault_ref'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'active'
    }
  }, {
    tableName: 'AuthOidcKeys',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['kid'] },
      { fields: ['active'] }
    ]
  })

  return AuthOidcKey
}
