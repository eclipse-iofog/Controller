'use strict'

module.exports = (sequelize, DataTypes) => {
  const NatsInstance = sequelize.define('NatsInstance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    isLeaf: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_leaf',
      defaultValue: true
    },
    isHub: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_hub',
      defaultValue: false
    },
    host: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'host'
    },
    serverPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'server_port'
    },
    leafPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'leaf_port'
    },
    clusterPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'cluster_port'
    },
    mqttPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'mqtt_port'
    },
    httpPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'http_port'
    },
    configMapName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'configmap_name'
    },
    jwtDirMountName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'jwt_dir_mount_name'
    },
    certSecretName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cert_secret_name'
    },
    jsStorageSize: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'js_storage_size'
    },
    jsMemoryStoreSize: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'js_memory_store_size'
    }
  }, {
    tableName: 'NatsInstances',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['iofog_uuid']
      }
    ]
  })

  NatsInstance.associate = function (models) {
    NatsInstance.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'cascade'
    })

    NatsInstance.hasMany(models.NatsConnection, {
      foreignKey: 'source_nats',
      as: 'upstreamNats'
    })
  }

  return NatsInstance
}
