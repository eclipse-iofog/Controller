/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const HashiCorpVaultProvider = require('./hashicorp-vault-provider')
const AWSSecretsManagerProvider = require('./aws-secrets-manager-provider')
const AzureKeyVaultProvider = require('./azure-key-vault-provider')
const GoogleSecretManagerProvider = require('./google-secret-manager-provider')
const config = require('../config')
const logger = require('../logger')

class VaultManager {
  constructor () {
    this.provider = null
    this.initialized = false
  }

  /**
   * Get base path with namespace substitution and defaults
   * @returns {string}
   */
  _getBasePath () {
    // Get basePath from env var or config, with default
    const basePath = process.env.VAULT_BASE_PATH || config.get('vault.basePath', 'iofog/$namespace/secrets')
    const namespace = process.env.CONTROLLER_NAMESPACE || config.get('app.namespace', 'iofog')

    // Replace $namespace variable
    return basePath.replace(/\$namespace/g, namespace)
  }

  /**
   * Validate and load HashiCorp Vault configuration
   * @returns {Object}
   */
  _loadHashiCorpConfig () {
    const address = process.env.VAULT_HASHICORP_ADDRESS || config.get('vault.hashicorp.address')
    const token = process.env.VAULT_HASHICORP_TOKEN || config.get('vault.hashicorp.token')
    const mount = (process.env.VAULT_HASHICORP_MOUNT || config.get('vault.hashicorp.mount', 'secret')).replace(/^\/+|\/+$/g, '')

    if (!address) {
      throw new Error('HashiCorp Vault address is required. Set VAULT_HASHICORP_ADDRESS env var or vault.hashicorp.address in config')
    }

    if (!token) {
      throw new Error('HashiCorp Vault token is required. Set VAULT_HASHICORP_TOKEN env var or vault.hashicorp.token in config')
    }

    return {
      address,
      token,
      mount,
      basePath: this._getBasePath()
    }
  }

  /**
   * Validate and load AWS Secrets Manager configuration
   * @returns {Object}
   */
  _loadAWSConfig () {
    const region = process.env.VAULT_AWS_REGION || process.env.AWS_REGION || config.get('vault.aws.region', 'us-east-1')
    const accessKeyId = process.env.VAULT_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || config.get('vault.aws.accessKeyId')
    const accessKey = process.env.VAULT_AWS_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || config.get('vault.aws.accessKey')

    // Region is required
    if (!region) {
      throw new Error('AWS region is required. Set VAULT_AWS_REGION or AWS_REGION env var or vault.aws.region in config')
    }

    // Validate AWS region format (basic validation)
    // AWS regions follow pattern: us-east-1, eu-west-1, ap-southeast-1, etc.
    const regionPattern = /^[a-z]{2}-[a-z]+-\d+$/
    if (!regionPattern.test(region)) {
      throw new Error(`Invalid AWS region format: "${region}". AWS regions should follow the pattern: us-east-1, eu-west-1, ap-southeast-1, etc.`)
    }

    // If accessKeyId is provided, accessKey must also be provided
    if (accessKeyId && !accessKey) {
      throw new Error('AWS secret access key is required when access key ID is provided. Set VAULT_AWS_ACCESS_KEY or AWS_SECRET_ACCESS_KEY env var or vault.aws.accessKey in config')
    }

    if (accessKey && !accessKeyId) {
      throw new Error('AWS access key ID is required when secret access key is provided. Set VAULT_AWS_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID env var or vault.aws.accessKeyId in config')
    }

    return {
      region,
      accessKeyId,
      accessKey,
      basePath: this._getBasePath()
    }
  }

  /**
   * Validate and load Azure Key Vault configuration
   * @returns {Object}
   */
  _loadAzureConfig () {
    const url = process.env.VAULT_AZURE_URL || config.get('vault.azure.url')
    const tenantId = process.env.VAULT_AZURE_TENANT_ID || process.env.AZURE_TENANT_ID || config.get('vault.azure.tenantId')
    const clientId = process.env.VAULT_AZURE_CLIENT_ID || process.env.AZURE_CLIENT_ID || config.get('vault.azure.clientId')
    const clientSecret = process.env.VAULT_AZURE_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET || config.get('vault.azure.clientSecret')

    if (!url) {
      throw new Error('Azure Key Vault URL is required. Set VAULT_AZURE_URL env var or vault.azure.url in config')
    }

    // If any credential is provided, all must be provided
    const hasCredentials = tenantId || clientId || clientSecret
    if (hasCredentials) {
      if (!tenantId) {
        throw new Error('Azure tenant ID is required when using service principal authentication. Set VAULT_AZURE_TENANT_ID or AZURE_TENANT_ID env var or vault.azure.tenantId in config')
      }
      if (!clientId) {
        throw new Error('Azure client ID is required when using service principal authentication. Set VAULT_AZURE_CLIENT_ID or AZURE_CLIENT_ID env var or vault.azure.clientId in config')
      }
      if (!clientSecret) {
        throw new Error('Azure client secret is required when using service principal authentication. Set VAULT_AZURE_CLIENT_SECRET or AZURE_CLIENT_SECRET env var or vault.azure.clientSecret in config')
      }
    }

    return {
      url,
      tenantId,
      clientId,
      clientSecret,
      basePath: this._getBasePath()
    }
  }

  /**
   * Validate and load Google Secret Manager configuration
   * @returns {Object}
   */
  _loadGoogleConfig () {
    const projectId = process.env.VAULT_GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID || config.get('vault.google.projectId')
    const credentials = process.env.VAULT_GOOGLE_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS || config.get('vault.google.credentials')

    if (!projectId) {
      throw new Error('Google Cloud project ID is required. Set VAULT_GOOGLE_PROJECT_ID or GCP_PROJECT_ID env var or vault.google.projectId in config')
    }

    return {
      projectId,
      credentials,
      basePath: this._getBasePath()
    }
  }

  /**
   * Initialize the vault manager based on configuration
   * @returns {Promise<void>}
   */
  async initialize () {
    // Check if vault is enabled using env var or config
    const vaultEnabled = process.env.VAULT_ENABLED === 'true' || config.get('vault.enabled', false)

    // If vault is not enabled, use internal encryption
    if (!vaultEnabled) {
      logger.info('Vault integration disabled, using internal encryption')
      this.initialized = false
      return
    }

    // Get provider type from env var or config
    const providerType = process.env.VAULT_PROVIDER || config.get('vault.provider')

    if (!providerType) {
      throw new Error('Vault provider type is required when vault is enabled. Set VAULT_PROVIDER env var or vault.provider in config')
    }

    let providerConfig

    // Initialize the appropriate provider and load configuration
    switch (providerType.toLowerCase()) {
      case 'hashicorp':
      case 'vault':
      case 'openbao':
        this.provider = new HashiCorpVaultProvider()
        providerConfig = this._loadHashiCorpConfig()
        break
      case 'aws-secrets-manager':
      case 'aws':
        this.provider = new AWSSecretsManagerProvider()
        providerConfig = this._loadAWSConfig()
        break
      case 'azure-key-vault':
      case 'azure':
        this.provider = new AzureKeyVaultProvider()
        providerConfig = this._loadAzureConfig()
        break
      case 'google-secret-manager':
      case 'gcp':
      case 'google':
        this.provider = new GoogleSecretManagerProvider()
        providerConfig = this._loadGoogleConfig()
        break
      default:
        throw new Error(`Unsupported vault provider: ${providerType}. Supported providers: hashicorp, vault, openbao, aws, azure, google`)
    }

    // Initialize provider with validated configuration
    try {
      await this.provider.initialize(providerConfig)
      this.initialized = true
      logger.info(`Vault integration enabled with provider: ${providerType}`)
    } catch (error) {
      // Re-throw with context
      throw new Error(`Failed to initialize vault provider '${providerType}': ${error.message}`)
    }
  }

  /**
   * Check if vault is enabled and initialized
   * @returns {boolean}
   */
  isEnabled () {
    return this.initialized && this.provider !== null
  }

  /**
   * Store a secret in the vault
   * @param {string} secretName - Secret name
   * @param {string} secretType - Secret type (optional)
   * @param {Object} data - Secret data
   * @returns {Promise<string>} - Returns vault reference (full path)
   */
  async store (secretName, secretType, data) {
    if (!this.isEnabled()) {
      throw new Error('Vault is not enabled')
    }

    // Build path: secretType/secretName or just secretName
    const path = secretType ? `${secretType}/${secretName}` : secretName
    // Provider's buildPath will prepend basePath
    return this.provider.store(path, data)
  }

  /**
   * Retrieve a secret from the vault
   * @param {string} secretName - Secret name or full vault path
   * @param {string} secretType - Secret type (optional)
   * @returns {Promise<Object>} - Returns secret data
   */
  async retrieve (secretName, secretType) {
    if (!this.isEnabled()) {
      throw new Error('Vault is not enabled')
    }

    // If secretName looks like a full path (contains /), use it directly
    // Otherwise build path from secretType and secretName
    const path = secretName.includes('/') ? secretName : (secretType ? `${secretType}/${secretName}` : secretName)
    return this.provider.retrieve(path)
  }

  /**
   * Delete a secret from the vault
   * @param {string} secretName - Secret name
   * @param {string} secretType - Secret type (optional)
   * @returns {Promise<void>}
   */
  async delete (secretName, secretType) {
    if (!this.isEnabled()) {
      throw new Error('Vault is not enabled')
    }

    const path = secretType ? `${secretType}/${secretName}` : secretName
    return this.provider.delete(path)
  }

  /**
   * Check if a secret exists in the vault
   * @param {string} secretName - Secret name
   * @param {string} secretType - Secret type (optional)
   * @returns {Promise<boolean>}
   */
  async exists (secretName, secretType) {
    if (!this.isEnabled()) {
      return false
    }

    const path = secretType ? `${secretType}/${secretName}` : secretName
    return this.provider.exists(path)
  }

  /**
   * Get the provider instance
   * @returns {BaseVaultProvider|null}
   */
  getProvider () {
    return this.provider
  }
}

// Export singleton instance
module.exports = new VaultManager()
