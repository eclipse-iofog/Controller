/*
 * *******************************************************************************
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

const BaseManager = require('./base-manager')
const models = require('../models')
const RbacCacheVersion = models.RbacCacheVersion

class RbacCacheVersionManager extends BaseManager {
  getEntity () {
    return RbacCacheVersion
  }

  /**
   * Get current cache version
   * @param {Object} transaction - Database transaction
   * @returns {Promise<number>} Current version number
   */
  async getVersion (transaction) {
    const cacheVersion = await this.findOne({ id: 1 }, transaction)
    if (!cacheVersion) {
      return 0
    }
    return cacheVersion.version || 0
  }

  /**
   * Increment cache version
   * This should be called whenever any RBAC resource (Role, RoleBinding, ServiceAccount) is modified
   * @param {Object} transaction - Database transaction
   * @returns {Promise<void>}
   */
  async incrementVersion (transaction) {
    const cacheVersion = await this.findOne({ id: 1 }, transaction)

    if (cacheVersion) {
      // Update existing version
      const newVersion = (cacheVersion.version || 0) + 1
      await this.update({ id: 1 }, { version: newVersion }, transaction)
    } else {
      // Create initial version if it doesn't exist
      await this.create({ id: 1, version: 1 }, transaction)
    }
  }

  /**
   * Initialize cache version row if it doesn't exist
   * This is called on server startup to ensure the row exists
   * @param {Object} transaction - Database transaction (optional)
   * @returns {Promise<void>}
   */
  async initializeVersion (transaction) {
    const cacheVersion = await this.findOne({ id: 1 }, transaction)
    if (!cacheVersion) {
      // Create initial version row
      await this.create({ id: 1, version: 1 }, transaction)
    }
  }
}

module.exports = new RbacCacheVersionManager()
