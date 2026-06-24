const BaseManager = require('./base-manager')
const models = require('../models')
const databaseProvider = require('../providers/database-factory')
const config = require('../../config')

const LOCK_ROW_ID = 1

class HubRouterConfigLockManager extends BaseManager {
  getEntity () {
    return models.HubRouterConfigLock
  }

  _getModelOptions (transaction) {
    return transaction && transaction.fakeTransaction
      ? {}
      : { transaction }
  }

  _isUniqueConstraintError (error) {
    return error && error.name === 'SequelizeUniqueConstraintError'
  }

  async initializeLock (transaction) {
    const lock = await this.findOne({ id: LOCK_ROW_ID }, transaction)
    if (!lock) {
      try {
        await this.create({ id: LOCK_ROW_ID, leaderUuid: null, claimedAt: null }, transaction)
      } catch (error) {
        if (!this._isUniqueConstraintError(error)) {
          throw error
        }
      }
    }
  }

  _getStalenessSeconds (timeoutSeconds) {
    if (timeoutSeconds != null) {
      return timeoutSeconds
    }
    return config.get('settings.hubRouterConfigLockTimeoutSeconds', 120)
  }

  async tryAcquire (controllerUuid, timeoutSeconds, transaction) {
    if (transaction.fakeTransaction) {
      return databaseProvider.sequelize.transaction((t) =>
        this.tryAcquire(controllerUuid, timeoutSeconds, t)
      )
    }

    await this.initializeLock(transaction)

    const stalenessSeconds = this._getStalenessSeconds(timeoutSeconds)
    const staleThreshold = new Date(Date.now() - stalenessSeconds * 1000)
    const lock = await this.findOne({ id: LOCK_ROW_ID }, transaction)

    if (!lock.leaderUuid || !lock.claimedAt) {
      await this.update({ id: LOCK_ROW_ID }, {
        leaderUuid: controllerUuid,
        claimedAt: new Date()
      }, transaction)
      return true
    }

    if (lock.leaderUuid === controllerUuid) {
      return true
    }

    if (lock.claimedAt < staleThreshold) {
      await this.update({ id: LOCK_ROW_ID }, {
        leaderUuid: controllerUuid,
        claimedAt: new Date()
      }, transaction)
      return true
    }

    return false
  }

  async release (controllerUuid, transaction) {
    const lock = await this.findOne({ id: LOCK_ROW_ID }, transaction)
    if (!lock || lock.leaderUuid !== controllerUuid) {
      return false
    }

    await this.update({ id: LOCK_ROW_ID }, {
      leaderUuid: null,
      claimedAt: null
    }, transaction)
    return true
  }
}

module.exports = new HubRouterConfigLockManager()
