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
