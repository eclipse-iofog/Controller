'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceLogStatus = sequelize.define('MicroserviceLogStatus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    microserviceUuid: {
      type: DataTypes.STRING(36),
      field: 'microservice_uuid',
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
    tableName: 'MicroserviceLogStatuses',
    timestamps: true,
    underscored: true
  })
  MicroserviceLogStatus.associate = function (models) {
    MicroserviceLogStatus.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceLogStatus
}
