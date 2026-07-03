const BaseManager = require('./base-manager')
const models = require('../models')
const config = require('../../config')
const { Op } = require('sequelize')
const {
  SERVICE_PLATFORM_REASONS,
  serializeSpecSnapshot,
  parseSpecSnapshot
} = require('../../schemas/fog-platform-spec')
const { withDbBusyRetry } = require('../../helpers/db-busy-retry')
const { claimNextReconcileTask } = require('../../helpers/db-dialect')

const ACTIVE_STATUSES = ['pending', 'in_progress']

const SERVICE_TASK_SELECT_SQL = `SELECT id, service_name AS serviceName, reason, spec_snapshot AS specSnapshot,
  status, leader_uuid AS leaderUuid, claimed_at AS claimedAt, next_attempt_at AS nextAttemptAt,
  attempts, last_error AS lastError, created_at AS createdAt, updated_at AS updatedAt
  FROM :table`

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
    const T = stalenessSeconds != null
      ? stalenessSeconds
      : config.get('settings.fogPlatformReconcileTaskStalenessSeconds', 300)
    const staleThreshold = new Date(Date.now() - T * 1000)
    const now = new Date()

    return claimNextReconcileTask({
      Entity: this.getEntity(),
      controllerUuid,
      staleThreshold,
      now,
      activeStatuses: ACTIVE_STATUSES,
      includeNextAttemptFilter: true,
      selectSql: SERVICE_TASK_SELECT_SQL,
      reloadTask: (id, transaction) => this.findOne({ id }, transaction)
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
