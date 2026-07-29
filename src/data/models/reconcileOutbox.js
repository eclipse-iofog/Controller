'use strict'

const RECONCILE_OUTBOX_KINDS = ['nats', 'fog_platform', 'service_platform', 'agent_propagation']

module.exports = (sequelize, DataTypes) => {
  const ReconcileOutbox = sequelize.define('ReconcileOutbox', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    kind: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'kind',
      validate: {
        isIn: [RECONCILE_OUTBOX_KINDS]
      }
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'payload'
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'idempotency_key'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at'
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'last_error'
    }
  }, {
    tableName: 'ReconcileOutbox',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
  })

  return ReconcileOutbox
}

module.exports.RECONCILE_OUTBOX_KINDS = RECONCILE_OUTBOX_KINDS
