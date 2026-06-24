const BaseManager = require('./base-manager')
const models = require('../models')
const config = require('../../config')
const databaseProvider = require('../providers/database-factory')
const { Op } = require('sequelize')
const {
  SERVICE_PLATFORM_REASONS,
  serializeSpecSnapshot,
  parseSpecSnapshot
} = require('../../schemas/fog-platform-spec')
const { withDbBusyRetry } = require('../../helpers/db-busy-retry')

const ACTIVE_STATUSES = ['pending', 'in_progress']

class ServicePlatformReconcileTaskManager extends BaseManager {
  getEntity () {
    return models.ServicePlatformReconcileTask
  }

  _normalizeReason (reason) {
    return SERVICE_PLATFORM_REASONS.includes(reason) ? reason : 'spec-changed'
  }

  getParsedSpecSnapshot (task) {
    if (!task || task.specSnapshot == null) {
      return null
    }
    return parseSpecSnapshot(task.specSnapshot)
  }

  async enqueueServicePlatformReconcileTask (options = {}, transaction) {
    if (transaction.fakeTransaction) {
      return databaseProvider.sequelize.transaction((t) =>
        this.enqueueServicePlatformReconcileTask(options, t)
      )
    }

    const serviceName = options.serviceName
    if (!serviceName) {
      throw new Error('serviceName is required to enqueue service platform reconcile task')
    }

    const reason = this._normalizeReason(options.reason)
    const specSnapshot = serializeSpecSnapshot(options.specSnapshot)
    const Entity = this.getEntity()

    const existing = await Entity.findOne({
      where: {
        serviceName,
        status: { [Op.in]: ACTIVE_STATUSES }
      },
      transaction
    })

    if (existing) {
      const update = { reason, specSnapshot }
      if (reason === 'manual-retry') {
        update.nextAttemptAt = null
        update.attempts = 0
        update.lastError = null
      }
      await Entity.update(update, { where: { id: existing.id }, transaction })
      return this.findOne({ id: existing.id }, transaction)
    }

    return this.create({
      serviceName,
      reason,
      specSnapshot,
      status: 'pending'
    }, transaction)
  }

  async claimNextServiceTask (controllerUuid, stalenessSeconds) {
    return withDbBusyRetry(() => this._claimNextServiceTaskInternal(controllerUuid, stalenessSeconds))
  }

  async _claimNextServiceTaskInternal (controllerUuid, stalenessSeconds) {
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

  async recordServiceTaskFailure (taskId, errorMessage, options = {}, transaction) {
    const maxAttempts = config.get('settings.servicePlatformReconcileMaxAttempts', 10)
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

module.exports = new ServicePlatformReconcileTaskManager()
