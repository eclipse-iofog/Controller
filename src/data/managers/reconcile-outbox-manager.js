const BaseManager = require('./base-manager')
const models = require('../models')
const { buildIdempotencyKey } = require('../../helpers/reconcile-outbox-keys')

class ReconcileOutboxManager extends BaseManager {
  getEntity () {
    return models.ReconcileOutbox
  }

  _isUniqueConstraintError (error) {
    return error && error.name === 'SequelizeUniqueConstraintError'
  }

  _serializePayload (payload) {
    return JSON.stringify(payload)
  }

  _parsePayload (row) {
    if (!row || row.payload == null) {
      return null
    }
    return JSON.parse(row.payload)
  }

  async _reopenProcessedRow (existing, kind, serializedPayload, transaction) {
    await this.update({ id: existing.id }, {
      kind,
      payload: serializedPayload,
      processedAt: null,
      lastError: null
    }, transaction)
    return this.findOne({ id: existing.id }, transaction)
  }

  async _resolveExistingEnqueue (existing, kind, serializedPayload, transaction) {
    if (existing.processedAt == null) {
      if (existing.payload !== serializedPayload) {
        await this.update({ id: existing.id }, { payload: serializedPayload }, transaction)
        return this.findOne({ id: existing.id }, transaction)
      }
      return existing
    }
    return this._reopenProcessedRow(existing, kind, serializedPayload, transaction)
  }

  async enqueue (kind, payload, idempotencyKey, transaction) {
    const serializedPayload = this._serializePayload(payload)
    const existing = await this.findOne({ idempotencyKey }, transaction)
    if (existing) {
      return this._resolveExistingEnqueue(existing, kind, serializedPayload, transaction)
    }

    const sequelize = models.sequelize
    const useSavepoint = sequelize.getDialect() === 'postgres'
    const savepointName = useSavepoint ? `sp_outbox_${Math.random().toString(36).slice(2, 10)}` : null

    try {
      if (useSavepoint) {
        await sequelize.query(`SAVEPOINT ${savepointName}`, { transaction })
      }
      const row = await this.create({
        kind,
        payload: serializedPayload,
        idempotencyKey,
        processedAt: null,
        lastError: null
      }, transaction)
      if (useSavepoint) {
        await sequelize.query(`RELEASE SAVEPOINT ${savepointName}`, { transaction })
      }
      return row
    } catch (error) {
      if (this._isUniqueConstraintError(error)) {
        if (useSavepoint) {
          await sequelize.query(`ROLLBACK TO SAVEPOINT ${savepointName}`, { transaction })
          await sequelize.query(`RELEASE SAVEPOINT ${savepointName}`, { transaction })
        }
        const raced = await this.findOne({ idempotencyKey }, transaction)
        if (raced) {
          return this._resolveExistingEnqueue(raced, kind, serializedPayload, transaction)
        }
      }
      throw error
    }
  }

  async enqueueFogPlatform (payload, transaction) {
    const idempotencyKey = buildIdempotencyKey('fog_platform', payload)
    return this.enqueue('fog_platform', payload, idempotencyKey, transaction)
  }

  async enqueueServicePlatform (payload, transaction) {
    const idempotencyKey = buildIdempotencyKey('service_platform', payload)
    return this.enqueue('service_platform', payload, idempotencyKey, transaction)
  }

  async enqueueNats (payload, transaction) {
    if (payload && payload.triggerReconcile === false) {
      return null
    }
    const { triggerReconcile, ...rest } = payload || {}
    const idempotencyKey = buildIdempotencyKey('nats', rest)
    return this.enqueue('nats', rest, idempotencyKey, transaction)
  }

  async claimUnprocessed (limit, transaction) {
    const sequelize = models.sequelize
    const dialect = sequelize.getDialect()
    const Entity = this.getEntity()
    const safeLimit = Math.max(1, limit || 1)

    if (dialect === 'sqlite') {
      return Entity.findAll({
        where: { processedAt: null },
        order: [['id', 'ASC']],
        limit: safeLimit,
        transaction
      })
    }

    const tableName = Entity.getTableName()
    const quotedTable = dialect === 'postgres' ? `"${tableName}"` : `\`${tableName}\``
    const rows = await sequelize.query(
      `SELECT id, kind, payload, idempotency_key AS idempotencyKey, created_at AS createdAt, processed_at AS processedAt, last_error AS lastError
       FROM ${quotedTable}
       WHERE processed_at IS NULL
       ORDER BY id ASC
       LIMIT :limit
       FOR UPDATE SKIP LOCKED`,
      {
        replacements: { limit: safeLimit },
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    )

    return rows.map((row) => Entity.build(row, { isNewRecord: false }))
  }

  async markProcessed (id, transaction) {
    await this.update({ id }, { processedAt: new Date(), lastError: null }, transaction)
    return this.findOne({ id }, transaction)
  }

  async markFailed (id, errorMessage, transaction) {
    await this.update({ id }, { lastError: errorMessage }, transaction)
    return this.findOne({ id }, transaction)
  }

  parsePayload (row) {
    return this._parsePayload(row)
  }
}

module.exports = new ReconcileOutboxManager()
