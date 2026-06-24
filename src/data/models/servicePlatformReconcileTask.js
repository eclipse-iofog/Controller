'use strict'

module.exports = (sequelize, DataTypes) => {
  const ServicePlatformReconcileTask = sequelize.define('ServicePlatformReconcileTask', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    serviceName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'service_name'
    },
    reason: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'reason'
    },
    specSnapshot: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'spec_snapshot'
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'pending',
      field: 'status'
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
    },
    nextAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'next_attempt_at'
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'attempts'
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'last_error'
    }
  }, {
    tableName: 'ServicePlatformReconcileTasks',
    timestamps: true,
    underscored: true
  })

  return ServicePlatformReconcileTask
}
