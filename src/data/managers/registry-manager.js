const BaseManager = require('./base-manager')
const vaultManager = require('../../vault/vault-manager')
const { scheduleVaultDeleteAfterCommit } = require('../../helpers/vault-transaction-helper')
const models = require('../models')
const Registry = models.Registry

class RegistryManager extends BaseManager {
  getEntity () {
    return Registry
  }

  async delete (data, transaction) {
    const registry = await this.findOne(data || {}, transaction)
    const result = await super.delete(data, transaction)
    if (registry && vaultManager.isEnabled()) {
      scheduleVaultDeleteAfterCommit(transaction, 'registry-' + registry.id, 'registry')
    }
    return result
  }
}

const instance = new RegistryManager()
module.exports = instance
