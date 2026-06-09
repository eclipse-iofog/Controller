const BaseManager = require('./base-manager')
const SecretHelper = require('../../helpers/secret-helper')
const models = require('../models')
const ConfigMap = models.ConfigMap

class ConfigMapManager extends BaseManager {
  getEntity () {
    return ConfigMap
  }

  async createConfigMap (name, immutable, data, useVault = true, transaction) {
    return this.create({
      name,
      immutable: immutable,
      useVault: useVault,
      data: data
    }, transaction)
  }

  async updateConfigMap (name, immutable, data, useVault = null, transaction) {
    // Get existing ConfigMap instance to preserve useVault if not explicitly provided
    const existing = await this.findOne({ name }, transaction)
    if (!existing) {
      throw new Error(`ConfigMap ${name} not found`)
    }

    // Update instance properties - this will trigger beforeSave hook
    existing.immutable = immutable
    existing.data = data
    // Preserve existing useVault if not explicitly provided, otherwise use new value
    existing.useVault = useVault !== null ? useVault : existing.useVault

    // Save the instance - this triggers beforeSave hook which handles encryption/vault
    const options = transaction.fakeTransaction ? {} : { transaction: transaction }
    await existing.save(options)

    return existing
  }

  async getConfigMap (name, transaction) {
    const configMap = await this.findOne({ name }, transaction)
    if (!configMap) {
      return null
    }
    return {
      ...configMap.toJSON(),
      data: configMap.data
    }
  }

  async listConfigMaps (transaction) {
    const configMaps = await this.findAll({}, transaction)
    return configMaps.map(configMap => ({
      id: configMap.id,
      name: configMap.name,
      immutable: configMap.immutable,
      useVault: configMap.useVault,
      created_at: configMap.created_at,
      updated_at: configMap.updated_at
    }))
  }

  async deleteConfigMap (name, transaction) {
    // Get ConfigMap to check if it's in vault
    const configMap = await this.findOne({ name }, transaction)
    if (configMap && configMap.useVault) {
      // Delete from vault if it was stored there
      const vaultManager = require('../../vault/vault-manager')
      if (vaultManager.isEnabled()) {
        await SecretHelper.deleteSecret(name, 'configmap')
      }
    }
    return this.delete({ name }, transaction)
  }
}

module.exports = new ConfigMapManager()
