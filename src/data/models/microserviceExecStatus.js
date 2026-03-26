'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceExecStatus = sequelize.define('MicroserviceExecStatus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    status: {
      type: DataTypes.TEXT,
      field: 'status'
    },
    execSessionId: {
      type: DataTypes.TEXT,
      field: 'exec_session_id'
    }
  }, {
    tableName: 'MicroserviceExecStatuses',
    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,
    underscored: true
  })
  MicroserviceExecStatus.associate = function (models) {
    MicroserviceExecStatus.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceExecStatus
}
