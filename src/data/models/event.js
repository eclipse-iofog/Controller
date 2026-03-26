'use strict'
module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    timestamp: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'timestamp'
    },
    eventType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'event_type'
    },
    endpointType: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'endpoint_type'
    },
    actorId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'actor_id'
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'method'
    },
    resourceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'resource_type'
    },
    resourceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'resource_id'
    },
    endpointPath: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'endpoint_path'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'status'
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'status_code'
    },
    statusMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'status_message'
    },
    requestId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'request_id'
    }
  }, {
    tableName: 'Events',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['timestamp']
      },
      {
        fields: ['endpoint_type']
      },
      {
        fields: ['actor_id']
      },
      {
        fields: ['resource_type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['method']
      },
      {
        fields: ['event_type']
      },
      {
        fields: ['created_at']
      }
    ]
  })
  return Event
}
