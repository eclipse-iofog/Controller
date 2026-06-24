const BaseManager = require('./base-manager')
const models = require('../models')
const config = require('../../config')
const databaseProvider = require('../providers/database-factory')
const { Op } = require('sequelize')
const { FOG_PLATFORM_REASONS } = require('../../schemas/fog-platform-spec')
const { withDbBusyRetry } = require('../../helpers/db-busy-retry')

const ACTIVE_STATUSES = ['pending', 'in_progress']

class FogPlatformReconcileTaskManager extends BaseManager {
  getEntity () {
    return models.FogPlatformReconcileTask
  }

  _normalizeReason (reason) {
    return FOG_PLATFORM_REASONS.includes(reason) ? reason : 'spec-changed'
  }

  async enqueueFogPlatformReconcileTask (options = {}, transaction) {
    if (transaction.fakeTransaction) {
      return databaseProvider.sequelize.transaction((t) =>
        this.enqueueFogPlatformReconcileTask(options, t)
      )
    }

    const fogUuid = options.fogUuid
    if (!fogUuid) {
      throw new Error('fogUuid is required to enqueue fog platform reconcile task')
    }

    const reason = this._normalizeReason(options.reason)
    const specGeneration = options.specGeneration != null ? options.specGeneration : null
    const Entity = this.getEntity()

    const existing = await Entity.findOne({
      where: {
        fogUuid,
        status: { [Op.in]: ACTIVE_STATUSES }
      },
      transaction
    })

    if (existing) {
      const update = { specGeneration }
      if (reason === 'delete' || existing.reason !== 'delete') {
        update.reason = reason
      }
      if (reason === 'manual-retry') {
        update.nextAttemptAt = null
        update.attempts = 0
        update.lastError = null
      }
      await Entity.update(update, { where: { id: existing.id }, transaction })
      return this.findOne({ id: existing.id }, transaction)
    }

    return this.create({
      fogUuid,
      reason,
      specGeneration,
      status: 'pending'
    }, transaction)
  }

  async claimNextFogTask (controllerUuid, stalenessSeconds) {
    return withDbBusyRetry(() => this._claimNextFogTaskInternal(controllerUuid, stalenessSeconds))
  }

  async _claimNextFogTaskInternal (controllerUuid, stalenessSeconds) {
    const sequelize = databaseProvider.sequelize
    const T = stalenessSeconds != null
      ? stalenessSeconds
      : config.get('settings.fogPlatformReconcileTaskStalenessSeconds', 300)
    const staleThreshold = new Date(Date.now() - T * 1000)
    const Entity = this.getEntity()
    const now = new Date()

    return sequelize.transaction(async (transaction) => {
      const task = await Entity.findOne({
        where: {
          status: { [Op.in]: ACTIVE_STATUSES },
          [Op.or]: [
            { nextAttemptAt: null },
            { nextAttemptAt: { [Op.lte]: now } }
          ],
          [Op.and]: [{
            [Op.or]: [
              { leaderUuid: null },
              { claimedAt: { [Op.lt]: staleThreshold } }
            ]
          }]
        },
        order: [['id', 'ASC']],
        limit: 1,
        transaction
      })
      if (!task) return null

      const [affected] = await Entity.update(
        { leaderUuid: controllerUuid, claimedAt: new Date(), status: 'in_progress' },
        {
          where: {
            id: task.id,
            [Op.or]: [
              { leaderUuid: null },
              { claimedAt: { [Op.lt]: staleThreshold } }
            ]
          },
          transaction
        }
      )
      if (affected === 0) return null
      return this.findOne({ id: task.id }, transaction)
    })
  }

  async recordFogTaskFailure (taskId, errorMessage, options = {}, transaction) {
    const maxAttempts = config.get('settings.fogPlatformReconcileMaxAttempts', 10)
    const backoffBaseSeconds = config.get('settings.fogPlatformReconcileBackoffBaseSeconds', 5)
    const attempts = (options.attempts != null ? options.attempts : 0) + 1
    const isPermanent = attempts >= maxAttempts
    const nextAttemptAt = isPermanent
      ? null
      : new Date(Date.now() + backoffBaseSeconds * Math.pow(2, attempts - 1) * 1000)

    const Entity = this.getEntity()
    await Entity.update({
      attempts,
      lastError: errorMessage,
      nextAttemptAt,
      status: isPermanent ? 'failed' : 'pending',
      leaderUuid: null,
      claimedAt: null
    }, {
      where: { id: taskId },
      transaction
    })

    return this.findOne({ id: taskId }, transaction)
  }
}

module.exports = new FogPlatformReconcileTaskManager()
