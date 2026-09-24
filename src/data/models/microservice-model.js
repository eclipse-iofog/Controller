'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceModel = sequelize.define('MicroserviceModel', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    bindPath: {
      type: DataTypes.TEXT,
      field: 'bind_path'
    },
    permissions: {
      type: DataTypes.TEXT,
      field: 'permissions'
    }
  }, {
    tableName: 'MicroserviceModels',
    timestamps: false,
    underscored: true
  })
  MicroserviceModel.associate = function (models) {
    MicroserviceModel.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceModel
}
