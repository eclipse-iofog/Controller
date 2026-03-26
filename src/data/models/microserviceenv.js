'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceEnv = sequelize.define('MicroserviceEnv', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    key: {
      type: DataTypes.TEXT,
      field: 'key'
    },
    value: {
      type: DataTypes.TEXT,
      field: 'value'
    },
    valueFromSecret: {
      type: DataTypes.TEXT,
      field: 'value_from_secret'
    },
    valueFromConfigMap: {
      type: DataTypes.TEXT,
      field: 'value_from_config_map'
    }
  }, {
    tableName: 'MicroserviceEnvs',
    timestamps: false,
    underscored: true
  })
  MicroserviceEnv.associate = function (models) {
    MicroserviceEnv.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceEnv
}
