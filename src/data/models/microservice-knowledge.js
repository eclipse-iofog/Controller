'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceKnowledge = sequelize.define('MicroserviceKnowledge', {
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
    tableName: 'MicroserviceKnowledge',
    timestamps: false,
    underscored: true
  })
  MicroserviceKnowledge.associate = function (models) {
    MicroserviceKnowledge.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceKnowledge
}
