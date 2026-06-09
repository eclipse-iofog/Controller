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
const https = require('https')
const http = require('http')
const { URL } = require('url')

class HashiCorpVaultProvider extends BaseVaultProvider {
  constructor () {
    super()
    this.token = null
    this.client = null
    this.mount = 'secret'
  }

  getName () {
    return 'hashicorp-vault'
  }

  async initialize (config) {
    // Call parent initialize to set this.config
    await super.initialize(config)

    this.token = config.token
    // Normalize mount (strip leading/trailing slashes)
    this.mount = (config.mount || 'secret').replace(/^\/+|\/+$/g, '')

    if (!this.config.address) {
      throw new Error('HashiCorp Vault address is required')
    }

    if (!this.token) {
      throw new Error('HashiCorp Vault token is required')
    }

    // Test connection
    await this.testConnection()
  }

  async _makeRequest (method, path, data = null) {
    const url = new URL(path, this.config.address)
    const isHttps = url.protocol === 'https:'

    const options = {
      method,
      headers: {
        'X-Vault-Token': this.token,
        'Content-Type': 'application/json'
      }
    }

    if (data) {
      options.headers['Content-Length'] = JSON.stringify(data).length
    }

    return new Promise((resolve, reject) => {
      const requestModule = isHttps ? https : http
      const req = requestModule.request(url, options, (res) => {
        let responseData = ''

        res.on('data', (chunk) => {
          responseData += chunk
        })

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(responseData)
              resolve(parsed)
            } catch (error) {
              resolve(responseData)
            }
          } else {
            const error = new Error(`Vault request failed: ${res.statusCode} ${res.statusMessage}`)
            error.statusCode = res.statusCode
            error.response = responseData
            reject(error)
          }
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      if (data) {
        req.write(JSON.stringify(data))
      }

      req.end()
    })
  }

  async store (path, data) {
    const vaultPath = this.buildPath(path)
    const secretPath = `v1/${this.mount}/data/${vaultPath}`

    const payload = {
      data: data
    }

    try {
      await this._makeRequest('POST', secretPath, payload)
      return vaultPath
    } catch (error) {
      // Try KV v1 API if v2 fails
      if (error.statusCode === 404) {
        const v1Path = `v1/${this.mount}/${vaultPath}`
        await this._makeRequest('POST', v1Path, data)
        return vaultPath
      }
      throw error
    }
  }

  async retrieve (path) {
    const vaultPath = this.buildPath(path)
    const secretPath = `v1/${this.mount}/data/${vaultPath}`

    try {
      const response = await this._makeRequest('GET', secretPath)
      // KV v2 API structure
      if (response.data && response.data.data) {
        return response.data.data
      }
      return response.data || response
    } catch (error) {
      // Try KV v1 API if v2 fails
      if (error.statusCode === 404) {
        const v1Path = `v1/${this.mount}/${vaultPath}`
        const response = await this._makeRequest('GET', v1Path)
        return response.data || response
      }
      throw error
    }
  }

  async delete (path) {
    const vaultPath = this.buildPath(path)
    const metadataPath = `v1/${this.mount}/metadata/${vaultPath}`

    try {
      // KV v2 full delete (removes metadata and all versions)
      await this._makeRequest('DELETE', metadataPath)
    } catch (error) {
      // Try KV v1 API if v2 fails / metadata not found
      if (error.statusCode === 404) {
        const v1Path = `v1/${this.mount}/${vaultPath}`
        try {
          await this._makeRequest('DELETE', v1Path)
        } catch (v1Error) {
          if (v1Error.statusCode !== 404) {
            throw v1Error
          }
          // If still 404, treat as already deleted
        }
      } else {
        throw error
      }
    }
  }

  async exists (path) {
    try {
      await this.retrieve(path)
      return true
    } catch (error) {
      if (error.statusCode === 404) {
        return false
      }
      throw error
    }
  }

  async list (path) {
    const vaultPath = this.buildPath(path)
    const secretPath = `v1/${this.mount}/metadata/${vaultPath}`

    try {
      const response = await this._makeRequest('LIST', secretPath)
      if (response.data && response.data.keys) {
        return response.data.keys.map(key => `${vaultPath}/${key}`)
      }
      return []
    } catch (error) {
      // Try KV v1 API if v2 fails
      if (error.statusCode === 404) {
        const v1Path = `v1/${this.mount}/${vaultPath}?list=true`
        try {
          const response = await this._makeRequest('GET', v1Path)
          if (response.data && response.data.keys) {
            return response.data.keys.map(key => `${vaultPath}/${key}`)
          }
        } catch (listError) {
          // If listing fails, return empty array
          return []
        }
      }
      return []
    }
  }

  async testConnection () {
    try {
      await this._makeRequest('GET', 'v1/sys/health')
      return true
    } catch (error) {
      throw new Error(`Failed to connect to HashiCorp Vault: ${error.message}`)
    }
  }

  getBasePath () {
    if (this.config && this.config.basePath && typeof this.config.basePath === 'string') {
      return this.config.basePath
    }
    return 'pot-controller/secrets'
  }
}

module.exports = HashiCorpVaultProvider
