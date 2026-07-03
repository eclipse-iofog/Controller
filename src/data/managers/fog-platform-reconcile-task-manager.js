const BaseManager = require('./base-manager')
const models = require('../models')
const config = require('../../config')
const { Op } = require('sequelize')
const { FOG_PLATFORM_REASONS } = require('../../schemas/fog-platform-spec')
const { withDbBusyRetry } = require('../../helpers/db-busy-retry')
const { claimNextReconcileTask } = require('../../helpers/db-dialect')

const ACTIVE_STATUSES = ['pending', 'in_progress']

const FOG_TASK_SELECT_SQL = `SELECT id, fog_uuid AS fogUuid, reason, spec_generation AS specGeneration,
  status, leader_uuid AS leaderUuid, claimed_at AS claimedAt, next_attempt_at AS nextAttemptAt,
  attempts, last_error AS lastError, created_at AS createdAt, updated_at AS updatedAt
  FROM :table`

class FogPlatformReconcileTaskManager extends BaseManager {
  getEntity () {
    return models.FogPlatformReconcileTask
  }

  _normalizeReason (reason) {
    return FOG_PLATFORM_REASONS.includes(reason) ? reason : 'spec-changed'
  }

  async enqueueFogPlatformReconcileTask (options = {}, transaction) {
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
      if (reason === 'delete' && existing.status === 'in_progress') {
        await Entity.update({
          reason: 'delete',
          specGeneration,
          status: 'pending',
          leaderUuid: null,
          claimedAt: null,
          nextAttemptAt: null,
          attempts: 0,
          lastError: null
        }, { where: { id: existing.id }, transaction })
        return this.findOne({ id: existing.id }, transaction)
      }

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
    const T = stalenessSeconds != null
      ? stalenessSeconds
      : config.get('settings.fogPlatformReconcileTaskStalenessSeconds', 300)
    const deleteT = config.get('settings.fogPlatformDeleteReconcileTaskStalenessSeconds', 60)
    const staleThreshold = new Date(Date.now() - T * 1000)
    const deleteStaleThreshold = new Date(Date.now() - deleteT * 1000)
    const now = new Date()

    return claimNextReconcileTask({
      Entity: this.getEntity(),
      controllerUuid,
      staleThreshold,
      deleteStaleThreshold,
      now,
      activeStatuses: ACTIVE_STATUSES,
      includeNextAttemptFilter: true,
      selectSql: FOG_TASK_SELECT_SQL,
      reloadTask: (id, transaction) => this.findOne({ id }, transaction)
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
