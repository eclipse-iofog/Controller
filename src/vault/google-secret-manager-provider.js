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

const BaseVaultProvider = require('./base-vault-provider')

class GoogleSecretManagerProvider extends BaseVaultProvider {
  constructor () {
    super()
    this.client = null
  }

  getName () {
    return 'google-secret-manager'
  }

  async initialize (config) {
    // Call parent initialize to set this.config
    await super.initialize(config)

    if (!config.projectId) {
      throw new Error('Google Cloud project ID is required')
    }

    try {
      const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')

      // Handle credentials - can be a file path (string) or credentials object
      let credentials = config.credentials
      let keyFilename

      // If credentials is a string, treat it as a file path
      if (typeof credentials === 'string' && credentials.trim() !== '') {
        keyFilename = credentials
        credentials = undefined
      }

      this.client = new SecretManagerServiceClient({
        projectId: config.projectId,
        keyFilename: keyFilename,
        credentials: credentials
      })

      this.projectId = config.projectId

      // Test connection
      await this.testConnection()
    } catch (error) {
      throw new Error(`Failed to initialize Google Secret Manager: ${error.message}. Make sure @google-cloud/secret-manager is installed.`)
    }
  }

  async store (path, data) {
    const secretName = this.buildPath(path)
    const secretId = this._sanitizeSecretName(secretName)
    const projectPath = this.client.projectPath(this.projectId)
    const secretPath = this.client.secretPath(this.projectId, secretId)

    try {
      // Check if secret exists
      try {
        await this.client.getSecret({ name: secretPath })
        // Secret exists, create new version
        const payload = Buffer.from(JSON.stringify(data)).toString('utf8')
        await this.client.addSecretVersion({
          parent: secretPath,
          payload: {
            data: payload
          }
        })
        return secretId
      } catch (error) {
        if (error.code === 5) { // NOT_FOUND
          // Create new secret
          const [secret] = await this.client.createSecret({
            parent: projectPath,
            secretId: secretId,
            secret: {
              replication: {
                automatic: {}
              }
            }
          })

          // Add first version
          const payload = Buffer.from(JSON.stringify(data)).toString('utf8')
          await this.client.addSecretVersion({
            parent: secret.name,
            payload: {
              data: payload
            }
          })

          return secretId
        }
        throw error
      }
    } catch (error) {
      throw new Error(`Failed to store secret in Google Secret Manager: ${error.message}`)
    }
  }

  async retrieve (path) {
    const secretName = this.buildPath(path)
    const secretId = this._sanitizeSecretName(secretName)
    const name = this.client.secretVersionPath(this.projectId, secretId, 'latest')

    try {
      const [version] = await this.client.accessSecretVersion({ name })
      if (version.payload && version.payload.data) {
        const data = version.payload.data.toString('utf8')
        return JSON.parse(data)
      }
      throw new Error('Secret has no data')
    } catch (error) {
      if (error.code === 5) { // NOT_FOUND
        throw new Error(`Secret not found: ${secretId}`)
      }
      throw error
    }
  }

  async delete (path) {
    const secretName = this.buildPath(path)
    const secretId = this._sanitizeSecretName(secretName)
    const name = this.client.secretPath(this.projectId, secretId)

    try {
      // Destroy existing versions to align with immediate delete semantics
      try {
        const [versions] = await this.client.listSecretVersions({ parent: name })
        for (const v of versions) {
          if (v.state !== 'DESTROYED') {
            try {
              await this.client.destroySecretVersion({ name: v.name })
            } catch (destroyErr) {
              // Ignore if already destroyed or not found
              if (destroyErr.code && destroyErr.code !== 5) {
                throw destroyErr
              }
            }
          }
        }
      } catch (listErr) {
        // If listing fails (e.g., secret absent), fall through to delete
      }

      await this.client.deleteSecret({ name })
    } catch (error) {
      if (error.code !== 5) { // NOT_FOUND
        throw error
      }
    }
  }

  async exists (path) {
    try {
      await this.retrieve(path)
      return true
    } catch (error) {
      if (error.message.includes('not found') || error.code === 5) {
        return false
      }
      throw error
    }
  }

  async list (path) {
    const prefix = this._sanitizeSecretName(this.buildPath(path))
    const parent = this.client.projectPath(this.projectId)

    try {
      const secrets = []
      const [secretList] = await this.client.listSecrets({ parent })
      for (const secret of secretList) {
        const secretId = secret.name.split('/').pop()
        if (secretId.startsWith(prefix)) {
          secrets.push(secretId)
        }
      }
      return secrets
    } catch (error) {
      return []
    }
  }

  async testConnection () {
    try {
      const parent = this.client.projectPath(this.projectId)
      await this.client.listSecrets({ parent })
      return true
    } catch (error) {
      throw new Error(`Failed to connect to Google Secret Manager: ${error.message}`)
    }
  }

  /**
   * Sanitize secret name for Google Secret Manager
   * Secret names can only contain lowercase letters, numbers, and hyphens
   */
  _sanitizeSecretName (name) {
    return name.replace(/[^a-z0-9-]/g, '-').toLowerCase()
  }

  getBasePath () {
    if (this.config && this.config.basePath && typeof this.config.basePath === 'string') {
      return this.config.basePath
    }
    return 'iofog-controller/secrets'
  }
}

module.exports = GoogleSecretManagerProvider
