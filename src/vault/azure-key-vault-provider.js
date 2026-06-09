/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const BaseVaultProvider = require('./base-vault-provider')

class AzureKeyVaultProvider extends BaseVaultProvider {
  constructor () {
    super()
    this.client = null
  }

  getName () {
    return 'azure-key-vault'
  }

  async initialize (config) {
    // Call parent initialize to set this.config
    await super.initialize(config)

    const vaultUrl = config.url
    if (!vaultUrl) {
      throw new Error('Azure Key Vault URL is required')
    }

    try {
      const { SecretClient } = require('@azure/keyvault-secrets')
      const { DefaultAzureCredential, ClientSecretCredential } = require('@azure/identity')

      let credential
      // Check if credentials are provided in config
      if (config.tenantId && config.clientId && config.clientSecret) {
        credential = new ClientSecretCredential(
          config.tenantId,
          config.clientId,
          config.clientSecret
        )
      } else {
        credential = new DefaultAzureCredential()
      }

      this.client = new SecretClient(vaultUrl, credential)

      // Test connection
      await this.testConnection()
    } catch (error) {
      throw new Error(`Failed to initialize Azure Key Vault: ${error.message}. Make sure @azure/keyvault-secrets and @azure/identity are installed.`)
    }
  }

  async store (path, data) {
    const secretName = this._sanitizeSecretName(this.buildPath(path))
    const secretValue = JSON.stringify(data)

    try {
      await this.client.setSecret(secretName, secretValue)
      return secretName
    } catch (error) {
      throw new Error(`Failed to store secret in Azure Key Vault: ${error.message}`)
    }
  }

  async retrieve (path) {
    const secretName = this._sanitizeSecretName(this.buildPath(path))

    try {
      const secret = await this.client.getSecret(secretName)
      if (secret.value) {
        return JSON.parse(secret.value)
      }
      throw new Error('Secret has no value')
    } catch (error) {
      if (error.statusCode === 404) {
        throw new Error(`Secret not found: ${secretName}`)
      }
      throw error
    }
  }

  async delete (path) {
    const secretName = this._sanitizeSecretName(this.buildPath(path))

    try {
      const poller = await this.client.beginDeleteSecret(secretName)
      await poller.pollUntilDone()
      // Purge to fully remove (align with immediate delete semantics)
      try {
        await this.client.purgeDeletedSecret(secretName)
      } catch (purgeError) {
        // Ignore if purge not supported or already gone
        if (purgeError.statusCode && purgeError.statusCode !== 404 && purgeError.statusCode !== 403) {
          throw purgeError
        }
      }
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error
      }
    }
  }

  async exists (path) {
    try {
      await this.retrieve(path)
      return true
    } catch (error) {
      if (error.message.includes('not found') || error.statusCode === 404) {
        return false
      }
      throw error
    }
  }

  async list (path) {
    const prefix = this._sanitizeSecretName(this.buildPath(path))

    try {
      const secrets = []
      for await (const secretProperties of this.client.listPropertiesOfSecrets()) {
        if (secretProperties.name.startsWith(prefix)) {
          secrets.push(secretProperties.name)
        }
      }
      return secrets
    } catch (error) {
      return []
    }
  }

  async testConnection () {
    try {
      // Try to list secrets to test connection
      const iterator = this.client.listPropertiesOfSecrets()
      await iterator.next()
      return true
    } catch (error) {
      throw new Error(`Failed to connect to Azure Key Vault: ${error.message}`)
    }
  }

  /**
   * Sanitize secret name for Azure Key Vault
   * Azure Key Vault secret names can only contain alphanumeric characters and hyphens
   */
  _sanitizeSecretName (name) {
    return name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
  }

  getBasePath () {
    if (this.config && this.config.basePath && typeof this.config.basePath === 'string') {
      return this.config.basePath
    }
    return 'pot-controller/secrets'
  }
}

module.exports = AzureKeyVaultProvider
