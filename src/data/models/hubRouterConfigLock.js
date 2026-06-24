'use strict'

module.exports = (sequelize, DataTypes) => {
  const HubRouterConfigLock = sequelize.define('HubRouterConfigLock', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      defaultValue: 1,
      field: 'id'
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
    tableName: 'HubRouterConfigLocks',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  })

  return HubRouterConfigLock
}
