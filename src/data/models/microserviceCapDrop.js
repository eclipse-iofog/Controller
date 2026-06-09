'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceCapDrop = sequelize.define('MicroserviceCapDrop', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    capDrop: {
      type: DataTypes.TEXT,
      field: 'cap_drop'
    }
  }, {
    tableName: 'MicroserviceCapDrop',
    timestamps: false,
    underscored: true
  })
  MicroserviceCapDrop.associate = function (models) {
    MicroserviceCapDrop.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceCapDrop
}
