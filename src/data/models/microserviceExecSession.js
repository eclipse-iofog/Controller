'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceExecSession = sequelize.define('MicroserviceExecSession', {
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
      allowNull: false
    },
    sessionId: {
      type: DataTypes.STRING(255),
      field: 'session_id',
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.TEXT,
      field: 'status',
      allowNull: true
    },
    userConnected: {
      type: DataTypes.BOOLEAN,
      field: 'user_connected',
      defaultValue: false
    },
    agentConnected: {
      type: DataTypes.BOOLEAN,
      field: 'agent_connected',
      defaultValue: false
    }
  }, {
    tableName: 'MicroserviceExecSessions',
    timestamps: true,
    underscored: true
  })
  MicroserviceExecSession.associate = function (models) {
    MicroserviceExecSession.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceExecSession
}
