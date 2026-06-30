'use strict'

const SecretHelper = require('../../helpers/secret-helper')
const {
  scheduleVaultPromoteAfterCommit,
  shouldDeferVaultStore
} = require('../../helpers/vault-transaction-helper')
const models = require('../models')

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
      beforeSave: async (configMap, options) => {
        if (configMap.changed('data')) {
          let useVault = configMap.getDataValue('useVault')
          if (useVault === undefined || useVault === null) {
            useVault = configMap.useVault !== undefined && configMap.useVault !== null
              ? configMap.useVault
              : true
          }
          useVault = Boolean(useVault)

          const plainData = configMap.data
          const transaction = options.transaction

          if (transaction && shouldDeferVaultStore('configmap', useVault)) {
            configMap.data = await SecretHelper.encryptSecretInternal(plainData, configMap.name)
            scheduleVaultPromoteAfterCommit(transaction, {
              secretData: plainData,
              secretName: configMap.name,
              secretType: 'configmap',
              useVault,
              model: () => models.ConfigMap,
              where: { name: configMap.name },
              field: 'data'
            })
            return
          }

          const encryptedData = await SecretHelper.encryptSecret(
            plainData,
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
