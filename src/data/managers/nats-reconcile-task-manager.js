const BaseManager = require('./base-manager')
const models = require('../models')
const config = require('../../config')
const { withDbBusyRetry } = require('../../helpers/db-busy-retry')
const { claimNextReconcileTask } = require('../../helpers/db-dialect')

const ACTIVE_STATUSES = ['pending', 'in_progress']

const NATS_TASK_SELECT_SQL = `SELECT id, reason, application_id AS applicationId,
  account_rule_id AS accountRuleId, user_rule_id AS userRuleId, fog_uuids AS fogUuids,
  status, leader_uuid AS leaderUuid, claimed_at AS claimedAt,
  created_at AS createdAt, updated_at AS updatedAt
  FROM :table`

class NatsReconcileTaskManager extends BaseManager {
  getEntity () {
    return models.NatsReconcileTask
  }

  async claimNext (controllerUuid, stalenessSeconds) {
    return withDbBusyRetry(() => this._claimNextInternal(controllerUuid, stalenessSeconds))
  }

  async _claimNextInternal (controllerUuid, stalenessSeconds) {
    const T = stalenessSeconds != null ? stalenessSeconds : config.get('settings.natsReconcileTaskStalenessSeconds', 900)
    const staleThreshold = new Date(Date.now() - T * 1000)
    const now = new Date()

    return claimNextReconcileTask({
      Entity: this.getEntity(),
      controllerUuid,
      staleThreshold,
      now,
      activeStatuses: ACTIVE_STATUSES,
      includeNextAttemptFilter: false,
      selectSql: NATS_TASK_SELECT_SQL,
      reloadTask: (id, transaction) => this.findOne({ id }, transaction)
    })
  }
}

module.exports = new NatsReconcileTaskManager()
