'use strict'

const SecretHelper = require('../../helpers/secret-helper')

module.exports = (sequelize, DataTypes) => {
  const ConfigMap = sequelize.define('ConfigMap', {
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
    immutable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'immutable',
      defaultValue: false
    },
    useVault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'use_vault',
      defaultValue: true
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'data',
      defaultValue: '{}',
      get () {
        const rawValue = this.getDataValue('data')
        if (!rawValue) return {}
        if (SecretHelper.isVaultReference(rawValue)) return rawValue
        try {
          return JSON.parse(rawValue)
        } catch (err) {
          return rawValue
        }
      },
      set (value) {
        this.setDataValue('data', JSON.stringify(value))
      }
    }
  }, {
    tableName: 'ConfigMaps',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['name']
      }
    ],
    hooks: {
      beforeSave: async (configMap) => {
        if (configMap.changed('data')) {
          // Get useVault value - prioritize getDataValue (for updates), then property, default to true
          let useVault = configMap.getDataValue('useVault')
          // If getDataValue returns undefined/null, try the property (for new instances)
          if (useVault === undefined || useVault === null) {
            useVault = configMap.useVault !== undefined && configMap.useVault !== null
              ? configMap.useVault
              : true
          }
          // Ensure boolean type
          useVault = Boolean(useVault)

          const encryptedData = await SecretHelper.encryptSecret(
            configMap.data,
            configMap.name,
            'configmap',
            useVault
          )
          configMap.data = encryptedData
        }
      },
      afterFind: async (configMap) => {
        if (configMap && configMap.data) {
          try {
            const decryptedData = await SecretHelper.decryptSecret(
              configMap.data,
              configMap.name,
              'configmap'
            )
            configMap.data = decryptedData
          } catch (error) {
            console.error('Error decrypting ConfigMap data:', error)
            configMap.data = {}
          }
        }
      }
    }
  })

  return ConfigMap
}
