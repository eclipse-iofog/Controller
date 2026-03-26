'use strict'

const SecretHelper = require('../../helpers/secret-helper')

module.exports = (sequelize, DataTypes) => {
  const Secret = sequelize.define('Secret', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'name',
      unique: true
    },
    type: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'type',
      validate: {
        isIn: [['Opaque', 'tls']]
      }
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'data',
      defaultValue: '{}',
      get () {
        const rawValue = this.getDataValue('data')
        if (!rawValue) return {}
        // If value is a vault reference, keep raw so helper can resolve
        if (SecretHelper.isVaultReference(rawValue)) return rawValue
        try {
          return JSON.parse(rawValue)
        } catch (err) {
          // Fallback: return raw when legacy data is not valid JSON
          return rawValue
        }
      },
      set (value) {
        this.setDataValue('data', JSON.stringify(value))
      }
    }
  }, {
    tableName: 'Secrets',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['name']
      }
    ],
    hooks: {
      beforeSave: async (secret) => {
        if (secret.changed('data')) {
          const encryptedData = await SecretHelper.encryptSecret(
            secret.data,
            secret.name,
            secret.type
          )
          secret.data = encryptedData
        }
      },
      afterFind: async (secret) => {
        if (secret && secret.data) {
          try {
            const decryptedData = await SecretHelper.decryptSecret(
              secret.data,
              secret.name,
              secret.type
            )
            secret.data = decryptedData
          } catch (error) {
            console.error('Error decrypting secret data:', error)
            secret.data = {}
          }
        }
      }
    }
  })

  return Secret
}
