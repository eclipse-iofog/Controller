const BaseManager = require('./base-manager')
const vaultManager = require('../../vault/vault-manager')
const { scheduleVaultDeleteAfterCommit } = require('../../helpers/vault-transaction-helper')
const models = require('../models')
const ConfigMap = models.ConfigMap

class ConfigMapManager extends BaseManager {
  getEntity () {
    return ConfigMap
  }

  async createConfigMap (name, immutable, data, useVault = true, transaction) {
    return this.create({
      name,
      immutable,
      useVault,
      data
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
    await existing.save({ transaction })

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
    const configMap = await this.findOne({ name }, transaction)
    const useVault = configMap && configMap.useVault
    await this.delete({ name }, transaction)
    if (useVault && vaultManager.isEnabled()) {
      scheduleVaultDeleteAfterCommit(transaction, name, 'configmap')
    }
  }
}

module.exports = new ConfigMapManager()
