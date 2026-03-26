'use strict'
module.exports = (sequelize, DataTypes) => {
  const ClusterController = sequelize.define('ClusterController', {
    uuid: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false,
      field: 'uuid'
    },
    host: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'host'
    },
    processId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'process_id'
    },
    lastHeartbeat: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_heartbeat'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'ClusterControllers',
    timestamps: true,
    underscored: true
  })
  return ClusterController
}
