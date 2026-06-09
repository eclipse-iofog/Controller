'use strict'
module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'name',
      unique: true,
      index: true
    },
    type: {
      type: DataTypes.ENUM('microservice', 'k8s', 'agent', 'external'),
      allowNull: false,
      field: 'type'
    },
    resource: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    targetPort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'target_port'
    },
    // protocol: {
    //   type: DataTypes.ENUM('tcp', 'http'),
    //   defaultValue: 'tcp',
    //   allowNull: false
    // },
    servicePort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'service_port'
    },
    k8sType: {
      type: DataTypes.ENUM('LoadBalancer', 'ClusterIP', 'NodePort'),
      allowNull: true,
      field: 'k8s_type'
    },
    bridgePort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'bridge_port'
    },
    defaultBridge: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'default_bridge',
      defaultValue: 'default-router'
    },
    serviceEndpoint: {
      type: DataTypes.TEXT,
      field: 'service_endpoint'
    },
    provisioningStatus: {
      type: DataTypes.ENUM('pending', 'ready', 'failed'),
      allowNull: false,
      field: 'provisioning_status',
      defaultValue: 'pending'
    },
    provisioningError: {
      type: DataTypes.TEXT,
      field: 'provisioning_error'
    }
  }, {
    tableName: 'Services',
    timestamps: true,
    underscored: true
  })

  Service.associate = function (models) {
    Service.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'resource',
        field: 'resource'
      },
      as: 'microservice',
      // We don't want to enforce this constraint since resource could be various types
      constraints: false
    })
    // Relationship with tags
    Service.belongsToMany(models.Tags, { as: 'tags', through: 'ServiceTags' })
  }

  return Service
}
