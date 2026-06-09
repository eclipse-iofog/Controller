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

const models = require('../models')
const logger = require('../../logger')
const { Op } = require('sequelize')

class FogUsedTokenManager {
  /**
   * Store a JTI (JWT ID) to mark it as used
   * @param {string} jti - The JWT ID
   * @param {string} fogUuid - The UUID of the fog node
   * @param {number} exp - The expiration timestamp
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<void>}
   */
  static async storeJti (jti, fogUuid, exp, transaction) {
    try {
      // Input validation
      if (!jti || typeof jti !== 'string') {
        throw new Error('JTI must be a non-empty string')
      }
      if (!fogUuid || typeof fogUuid !== 'string') {
        throw new Error('Fog UUID must be a non-empty string')
      }

      // Ensure exp is a valid integer (Unix timestamp)
      const expiryTime = parseInt(exp, 10)
      if (isNaN(expiryTime) || expiryTime <= 0) {
        throw new Error('Expiration timestamp must be a positive integer')
      }

      // Prepare the data object
      const tokenData = {
        jti,
        iofogUuid: fogUuid,
        expiryTime: expiryTime
      }

      // Create the record with or without transaction
      if (!transaction || transaction.fakeTransaction) {
        await models.FogUsedToken.create(tokenData)
      } else {
        await models.FogUsedToken.create(tokenData, { transaction })
      }
    } catch (error) {
      // Check if it's a duplicate JTI error
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields && error.fields.jti) {
        logger.warn(`JTI already exists: ${jti}`)
        throw new Error('JWT token already used')
      }

      logger.error(`Failed to store JTI: ${error.message}`)
      throw error
    }
  }

  /**
   * Check if a JTI has already been used
   * @param {string} jti - The JWT ID to check
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<boolean>} True if the JTI has been used, false otherwise
   */
  static async isJtiUsed (jti, transaction) {
    try {
      let token
      if (!transaction || transaction.fakeTransaction) {
        // If no transaction or fake transaction, query without transaction
        token = await models.FogUsedToken.findOne({
          where: { jti }
        })
      } else {
        // Use the provided transaction
        token = await models.FogUsedToken.findOne({
          where: { jti },
          transaction
        })
      }
      return !!token
    } catch (error) {
      logger.error(`Failed to check JTI: ${error.message}`)
      throw error
    }
  }

  /**
   * Clean up expired JTIs
   * @returns {Promise<number>} Number of deleted tokens
   */
  static async cleanupExpiredJtis () {
    try {
      const now = Math.floor(Date.now() / 1000) // Convert to Unix timestamp (seconds)
      const result = await models.FogUsedToken.destroy({
        where: {
          expiryTime: {
            [Op.lt]: now
          }
        }
      })
      logger.debug(`Cleaned up ${result} expired JTIs`)
      return result
    } catch (error) {
      logger.error(`Failed to cleanup expired JTIs: ${error.message}`)
      throw error
    }
  }
}

module.exports = FogUsedTokenManager
