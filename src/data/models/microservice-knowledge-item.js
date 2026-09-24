'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceKnowledgeItem = sequelize.define('MicroserviceKnowledgeItem', {
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
    tableName: 'MicroserviceKnowledgeItems',
    timestamps: false,
    underscored: true
  })
  MicroserviceKnowledgeItem.associate = function (models) {
    MicroserviceKnowledgeItem.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
    MicroserviceKnowledgeItem.belongsTo(models.FleetKnowledge, {
      foreignKey: {
        name: 'name',
        field: 'name'
      },
      targetKey: 'name',
      as: 'knowledge',
      onDelete: 'restrict'
    })
  }
  return MicroserviceKnowledgeItem
}
