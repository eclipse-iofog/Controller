'use strict'

module.exports = (sequelize, DataTypes) => {
  const NatsReconcileTask = sequelize.define('NatsReconcileTask', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    reason: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'reason'
    },
    applicationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'application_id'
    },
    accountRuleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'account_rule_id'
    },
    userRuleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_rule_id'
    },
    fogUuids: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'fog_uuids'
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'status',
      defaultValue: 'pending'
    },
    leaderUuid: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'leader_uuid'
    },
    claimedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'claimed_at'
    }
  }, {
    tableName: 'NatsReconcileTasks',
    timestamps: true,
    underscored: true
  })

  return NatsReconcileTask
}
