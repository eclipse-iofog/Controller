const models = require('../models')
const logger = require('../../logger')
const AppHelper = require('../../helpers/app-helper')
const { Op } = require('sequelize')

class FogUsedTokenManager {
  static async storeJti (jti, fogUuid, exp, transaction) {
    AppHelper.checkTransaction(transaction)

    try {
      if (!jti || typeof jti !== 'string') {
        throw new Error('JTI must be a non-empty string')
      }
      if (!fogUuid || typeof fogUuid !== 'string') {
        throw new Error('Fog UUID must be a non-empty string')
      }

      const expiryTime = parseInt(exp, 10)
      if (isNaN(expiryTime) || expiryTime <= 0) {
        throw new Error('Expiration timestamp must be a positive integer')
      }

      await models.FogUsedToken.create({
        jti,
        iofogUuid: fogUuid,
        expiryTime
      }, { transaction })
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields && error.fields.jti) {
        logger.warn(`JTI already exists: ${jti}`)
        throw new Error('JWT token already used')
      }

      logger.error(`Failed to store JTI: ${error.message}`)
      throw error
    }
  }

  static async isJtiUsed (jti, transaction) {
    AppHelper.checkTransaction(transaction)

    try {
      const token = await models.FogUsedToken.findOne({
        where: { jti },
        transaction
      })
      return !!token
    } catch (error) {
      logger.error(`Failed to check JTI: ${error.message}`)
      throw error
    }
  }

  static async cleanupExpiredJtis (transaction) {
    AppHelper.checkTransaction(transaction)

    try {
      const now = Math.floor(Date.now() / 1000)
      const result = await models.FogUsedToken.destroy({
        where: {
          expiryTime: {
            [Op.lt]: now
          }
        },
        transaction
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
