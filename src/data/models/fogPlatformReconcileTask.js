'use strict'

module.exports = (sequelize, DataTypes) => {
  const FogPlatformReconcileTask = sequelize.define('FogPlatformReconcileTask', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    fogUuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'fog_uuid'
    },
    reason: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'reason'
    },
    specGeneration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'spec_generation'
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
    tableName: 'FogPlatformReconcileTasks',
    timestamps: true,
    underscored: true
  })

  FogPlatformReconcileTask.associate = (models) => {
    FogPlatformReconcileTask.belongsTo(models.Fog, {
      foreignKey: 'fog_uuid',
      as: 'fog'
    })
  }

  return FogPlatformReconcileTask
}
