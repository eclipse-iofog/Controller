const BaseManager = require('./base-manager')
const SecretHelper = require('../../helpers/secret-helper')
const vaultManager = require('../../vault/vault-manager')
const models = require('../models')
const Registry = models.Registry

class RegistryManager extends BaseManager {
  getEntity () {
    return Registry
  }

  async delete (data, transaction) {
    const registry = await this.findOne(data || {}, transaction)
    if (registry && vaultManager.isEnabled()) {
      try {
        await SecretHelper.deleteSecret('registry-' + registry.id, 'registry')
      } catch (err) {
        // Ignore 404 or other errors (e.g. password was never stored in vault)
      }
    }
    return super.delete(data, transaction)
  }
}

const instance = new RegistryManager()
module.exports = instance
