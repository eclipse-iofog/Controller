const crypto = require('crypto')
const vaultManager = require('../vault/vault-manager')
const logger = require('../logger')

class SecretHelper {
  constructor () {
    this.ALGORITHM = 'aes-256-gcm'
    this.IV_LENGTH = 12
    this.SALT_LENGTH = 16
    this.TAG_LENGTH = 16
    this.KEY_LENGTH = 32
    this.ITERATIONS = 100000
    this.VAULT_REF_PREFIX = 'VAULT_REF:'
  }

  /**
   * Store secret data - uses vault if enabled, otherwise uses internal encryption
   * @param {Object} secretData - Secret data to store
   * @param {string} secretName - Secret name
   * @param {string} secretType - Secret type (optional)
   * @param {boolean} useVault - For ConfigMaps: whether to use vault (optional, defaults to true if vault enabled)
   * @returns {Promise<string>} - Returns encrypted data or vault reference
   */
  _shouldUseVault (secretType, useVault) {
    const isConfigMap = secretType === 'configmap'

    if (isConfigMap) {
      if (useVault === false) {
        return false
      }
      if (useVault === true || useVault === null) {
        return vaultManager.isEnabled()
      }
    }

    return vaultManager.isEnabled()
  }

  async encryptSecretInternal (secretData, secretName) {
    const salt = crypto.randomBytes(this.SALT_LENGTH)
    const key = await this._deriveKey(secretName, salt)
    const iv = crypto.randomBytes(this.IV_LENGTH)
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(secretData), 'utf8'),
      cipher.final()
    ])
    const tag = cipher.getAuthTag()
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64')
  }

  async storeInVaultAndGetReference (secretData, secretName, secretType = null, useVault = null) {
    if (!this._shouldUseVault(secretType, useVault)) {
      throw new Error('Vault storage requested but vault is not configured for this resource')
    }

    try {
      const vaultPath = await vaultManager.store(secretName, secretType, secretData)
      return `${this.VAULT_REF_PREFIX}${vaultPath}`
    } catch (error) {
      logger.error(`Failed to store secret in vault: ${error.message}`)
      throw error
    }
  }

  async encryptSecret (secretData, secretName, secretType = null, useVault = null) {
    if (this._shouldUseVault(secretType, useVault)) {
      return this.storeInVaultAndGetReference(secretData, secretName, secretType, useVault)
    }

    return this.encryptSecretInternal(secretData, secretName)
  }

  /**
   * Retrieve secret data - uses vault if reference detected, otherwise uses internal decryption
   * @param {string} encryptedData - Encrypted data or vault reference
   * @param {string} secretName - Secret name
   * @param {string} secretType - Secret type (optional)
   * @returns {Promise<Object>} - Returns decrypted secret data
   */
  async decryptSecret (encryptedData, secretName, secretType = null) {
    // Check if this is a vault reference
    if (encryptedData && encryptedData.startsWith(this.VAULT_REF_PREFIX)) {
      if (!vaultManager.isEnabled()) {
        throw new Error('Vault reference found but vault is not enabled')
      }

      try {
        // The vault path stored in database is the full path from vault
        // Extract it and use the provider directly to retrieve
        const vaultPath = encryptedData.substring(this.VAULT_REF_PREFIX.length)
        const provider = vaultManager.getProvider()

        if (provider) {
          // Use the stored vault path directly
          return await provider.retrieve(vaultPath)
        } else {
          // Fallback: reconstruct path from secretName and secretType
          return await vaultManager.retrieve(secretName, secretType)
        }
      } catch (error) {
        logger.error(`Failed to retrieve secret from vault: ${error.message}`)
        throw error
      }
    }

    // Fallback to internal decryption
    const buffer = Buffer.from(encryptedData, 'base64')
    const salt = buffer.subarray(0, this.SALT_LENGTH)
    const iv = buffer.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH)
    const tag = buffer.subarray(this.SALT_LENGTH + this.IV_LENGTH, this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH)
    const encrypted = buffer.subarray(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH)
    const key = await this._deriveKey(secretName, salt)
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])
    return JSON.parse(decrypted.toString('utf8'))
  }

  /**
   * Delete secret from vault or database
   * @param {string} secretName - Secret name
   * @param {string} secretType - Secret type (optional)
   * @returns {Promise<void>}
   */
  async deleteSecret (secretName, secretType = null) {
    if (vaultManager.isEnabled()) {
      try {
        await vaultManager.delete(secretName, secretType)
      } catch (error) {
        logger.error(`Failed to delete secret from vault: ${error.message}`)
        throw error
      }
    }
    // For internal encryption, deletion is handled by database
  }

  /**
   * Check if secret is stored in vault
   * @param {string} encryptedData - Encrypted data or vault reference
   * @returns {boolean}
   */
  isVaultReference (encryptedData) {
    return encryptedData && encryptedData.startsWith(this.VAULT_REF_PREFIX)
  }

  async _deriveKey (secretName, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        secretName,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        'sha256',
        (err, key) => {
          if (err) reject(err)
          else resolve(key)
        }
      )
    })
  }
}

module.exports = new SecretHelper()
