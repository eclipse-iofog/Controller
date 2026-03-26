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

/**
 * Base class for vault providers
 * All vault providers must implement this interface
 */
class BaseVaultProvider {
  constructor () {
    this.config = null
  }

  /**
   * Initialize the vault provider with configuration
   * This method should be called by child classes via super.initialize(config)
   * @param {Object} config - Provider-specific configuration
   * @returns {Promise<void>}
   */
  async initialize (config) {
    if (!config || typeof config !== 'object') {
      throw new Error(`${this.constructor.name}: initialize() requires a valid config object`)
    }
    this.config = config
    // Child classes should override this method and call super.initialize(config) first
  }

  /**
   * Store a secret in the vault
   * @param {string} path - Secret path/identifier
   * @param {Object} data - Secret data to store
   * @returns {Promise<string>} - Returns vault reference/identifier
   */
  async store (path, data) {
    throw new Error(`${this.constructor.name}: store() must be implemented by vault provider`)
  }

  /**
   * Retrieve a secret from the vault
   * @param {string} path - Secret path/identifier
   * @returns {Promise<Object>} - Returns secret data
   */
  async retrieve (path) {
    throw new Error(`${this.constructor.name}: retrieve() must be implemented by vault provider`)
  }

  /**
   * Delete a secret from the vault
   * @param {string} path - Secret path/identifier
   * @returns {Promise<void>}
   */
  async delete (path) {
    throw new Error(`${this.constructor.name}: delete() must be implemented by vault provider`)
  }

  /**
   * Check if a secret exists in the vault
   * @param {string} path - Secret path/identifier
   * @returns {Promise<boolean>}
   */
  async exists (path) {
    throw new Error(`${this.constructor.name}: exists() must be implemented by vault provider`)
  }

  /**
   * List all secrets under a given path
   * @param {string} path - Base path to list from
   * @returns {Promise<string[]>} - Returns array of secret paths
   */
  async list (path) {
    throw new Error(`${this.constructor.name}: list() must be implemented by vault provider`)
  }

  /**
   * Test the connection to the vault
   * @returns {Promise<boolean>}
   */
  async testConnection () {
    throw new Error(`${this.constructor.name}: testConnection() must be implemented by vault provider`)
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName () {
    throw new Error(`${this.constructor.name}: getName() must be implemented by vault provider`)
  }

  /**
   * Normalize a path by removing leading/trailing slashes and multiple slashes
   * @param {string} path - Path to normalize
   * @returns {string} - Normalized path
   * @private
   */
  _normalizePath (path) {
    if (!path || typeof path !== 'string') {
      return ''
    }
    // Remove leading and trailing slashes, then replace multiple slashes with single slash
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
  }

  /**
   * Build a vault path from secret name and type
   * @param {string} path - Full path or secret name
   * @returns {string} - Vault path
   */
  buildPath (path) {
    if (!path || typeof path !== 'string' || path.trim() === '') {
      throw new Error(`${this.constructor.name}: buildPath() requires a non-empty path string`)
    }

    const basePath = this._normalizePath(this.getBasePath())
    const normalizedPath = this._normalizePath(path)

    // If path already includes basePath, return as-is (normalized)
    if (normalizedPath.startsWith(basePath + '/') || normalizedPath === basePath) {
      return normalizedPath
    }

    // Otherwise, prepend basePath
    return `${basePath}/${normalizedPath}`
  }

  /**
   * Get the base path for secrets
   * @returns {string}
   */
  getBasePath () {
    if (this.config && this.config.basePath && typeof this.config.basePath === 'string') {
      return this.config.basePath
    }
    // Default base path (should be overridden by vault-manager, but provide fallback)
    return 'controller/secrets'
  }
}

module.exports = BaseVaultProvider
