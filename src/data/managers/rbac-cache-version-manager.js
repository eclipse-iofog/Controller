/*
 * *******************************************************************************
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

const BaseManager = require('./base-manager')
const models = require('../models')
const RbacCacheVersion = models.RbacCacheVersion
const logger = require('../../logger')

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

  _getModelOptions (transaction) {
    return transaction && transaction.fakeTransaction
      ? {}
      : { transaction: transaction }
  }

  _extractAffectedRows (updateResult) {
    if (Array.isArray(updateResult)) {
      return Number(updateResult[0] || 0)
    }
    return Number(updateResult || 0)
  }

  _isUniqueConstraintError (error) {
    return error && error.name === 'SequelizeUniqueConstraintError'
  }

  _isVersionOverflowError (error) {
    if (!error || error.name !== 'SequelizeDatabaseError') {
      return false
    }
    const message = (error.message || '').toLowerCase()
    return message.includes('out of range for type bigint') ||
      message.includes('bigint value is out of range') ||
      message.includes('integer overflow') ||
      message.includes('numeric value out of range')
  }

  async _incrementVersionAtomic (transaction) {
    return this.getEntity().update(
      { version: models.Sequelize.literal('version + 1') },
      {
        where: { id: 1 },
        ...this._getModelOptions(transaction)
      }
    )
  }

  async _resetVersionToOne (transaction) {
    const updateResult = await this.getEntity().update(
      { version: 1 },
      {
        where: { id: 1 },
        ...this._getModelOptions(transaction)
      }
    )

    if (this._extractAffectedRows(updateResult) === 0) {
      try {
        await this.create({ id: 1, version: 1 }, transaction)
      } catch (error) {
        if (!this._isUniqueConstraintError(error)) {
          throw error
        }
      }
    }
  }

  /**
   * Increment cache version
   * This should be called whenever any RBAC resource (Role, RoleBinding, ServiceAccount) is modified
   * @param {Object} transaction - Database transaction
   * @returns {Promise<void>}
   */
  async incrementVersion (transaction) {
    try {
      const updateResult = await this._incrementVersionAtomic(transaction)
      const affectedRows = this._extractAffectedRows(updateResult)

      if (affectedRows === 0) {
        try {
          await this.create({ id: 1, version: 1 }, transaction)
        } catch (error) {
          if (this._isUniqueConstraintError(error)) {
            await this._incrementVersionAtomic(transaction)
          } else {
            throw error
          }
        }
      }
    } catch (error) {
      if (!this._isVersionOverflowError(error)) {
        throw error
      }

      logger.warn(`RBAC cache version overflow detected. Resetting version to 1. Error: ${error.message}`)
      await this._resetVersionToOne(transaction)
      await this._incrementVersionAtomic(transaction)
      logger.info('RBAC cache version reset and increment completed successfully')
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
