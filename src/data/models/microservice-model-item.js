'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceModelItem = sequelize.define('MicroserviceModelItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'name'
    }
  }, {
    tableName: 'MicroserviceModelItems',
    timestamps: false,
    underscored: true
  })
  MicroserviceModelItem.associate = function (models) {
    MicroserviceModelItem.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
    MicroserviceModelItem.belongsTo(models.FleetModel, {
      foreignKey: {
        name: 'name',
        field: 'name'
      },
      targetKey: 'name',
      as: 'model',
      onDelete: 'restrict'
    })
  }
  return MicroserviceModelItem
}
