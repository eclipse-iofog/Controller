'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceExtraHost = sequelize.define('MicroserviceExtraHost', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    templateType: {
      type: DataTypes.TEXT
    },
    name: {
      type: DataTypes.TEXT
    },
    template: {
      type: DataTypes.TEXT
    }, // Contains the template string
    value: {
      type: DataTypes.TEXT
    } // Contains the value of the resolved template string (will be == template string if type litteral)
  }, {
    tableName: 'MicroserviceExtraHost',
    timestamps: false,
    underscored: true
  })
  MicroserviceExtraHost.associate = function (models) {
    MicroserviceExtraHost.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
    MicroserviceExtraHost.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'targetMicroserviceUuid',
        field: 'target_microservice_uuid'
      },
      as: 'targetMicroservice',
      onDelete: 'cascade'
    })
    MicroserviceExtraHost.belongsTo(models.Fog, {
      foreignKey: {
        name: 'targetFogUuid',
        field: 'target_fog_uuid'
      },
      as: 'targetFog',
      onDelete: 'cascade'
    })
  }
  return MicroserviceExtraHost
}
