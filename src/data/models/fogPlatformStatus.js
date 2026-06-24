'use strict'

module.exports = (sequelize, DataTypes) => {
  const FogPlatformStatus = sequelize.define('FogPlatformStatus', {
    fogUuid: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false,
      field: 'fog_uuid'
    },
    observedGeneration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'observed_generation'
    },
    phase: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'Pending',
      field: 'phase'
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'last_error'
    },
    lastTransitionAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_transition_at'
    },
    conditionsJson: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'conditions_json'
    }
  }, {
    tableName: 'FogPlatformStatuses',
    timestamps: true,
    underscored: true
  })

  FogPlatformStatus.associate = (models) => {
    FogPlatformStatus.belongsTo(models.Fog, {
      foreignKey: 'fog_uuid',
      as: 'fog'
    })
  }

  return FogPlatformStatus
}
