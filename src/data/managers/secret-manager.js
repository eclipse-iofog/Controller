const BaseManager = require('./base-manager')
const models = require('../models')
const Secret = models.Secret

class SecretManager extends BaseManager {
  getEntity () {
    return Secret
  }

  async createSecret (name, type, data, transaction) {
    // const encryptedData = await SecretHelper.encryptSecret(data, name)
    return this.create({
      name,
      type,
      data
    }, transaction)
  }

  async updateSecret (name, type, data, transaction) {
    const existing = await this.findOne({ name }, transaction)
    if (!existing) {
      throw new Error(`Secret ${name} not found`)
    }

    existing.type = type
    existing.data = data
    await existing.save({ transaction })

    return existing
  }

  async getSecret (name, transaction) {
    const secret = await this.findOne({ name }, transaction)
    if (!secret) {
      return null
    }
    // const decryptedData = await SecretHelper.decryptSecret(secret.data, name)
    return {
      ...secret.toJSON(),
      data: secret.data
    }
  }

  async listSecrets (transaction) {
    const secrets = await this.findAll({}, transaction)
    return secrets.map(secret => ({
      id: secret.id,
      name: secret.name,
      type: secret.type,
      created_at: secret.created_at,
      updated_at: secret.updated_at
    }))
  }

  async deleteSecret (name, transaction) {
    return this.delete({ name }, transaction)
  }
}

module.exports = new SecretManager()
