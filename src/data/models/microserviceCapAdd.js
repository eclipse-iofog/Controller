'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceCapAdd = sequelize.define('MicroserviceCapAdd', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    capAdd: {
      type: DataTypes.TEXT,
      field: 'cap_add'
    }
  }, {
    tableName: 'MicroserviceCapAdd',
    timestamps: false,
    underscored: true
  })
  MicroserviceCapAdd.associate = function (models) {
    MicroserviceCapAdd.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceCapAdd
}
