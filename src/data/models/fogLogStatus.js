'use strict'
module.exports = (sequelize, DataTypes) => {
  const FogLogStatus = sequelize.define('FogLogStatus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    iofogUuid: {
      type: DataTypes.STRING(36),
      field: 'iofog_uuid',
      allowNull: true
    },
    logSessionId: {
      type: DataTypes.TEXT,
      field: 'log_session_id',
      allowNull: true
    },
    sessionId: {
      type: DataTypes.TEXT,
      field: 'session_id',
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.TEXT,
      field: 'status',
      allowNull: true
    },
    tailConfig: {
      type: DataTypes.TEXT,
      field: 'tail_config',
      allowNull: true
    },
    agentConnected: {
      type: DataTypes.BOOLEAN,
      field: 'agent_connected',
      defaultValue: false
    },
    userConnected: {
      type: DataTypes.BOOLEAN,
      field: 'user_connected',
      defaultValue: false
    }
  }, {
    tableName: 'FogLogStatuses',
    timestamps: true,
    underscored: true
  })
  FogLogStatus.associate = function (models) {
    FogLogStatus.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'fog',
      onDelete: 'cascade'
    })
  }
  return FogLogStatus
}
