'use strict'

module.exports = (sequelize, DataTypes) => {
  const MicroserviceTemplateVariable = sequelize.define('MicroserviceTemplateVariable', {
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
    description: {
      type: DataTypes.TEXT,
      field: 'description',
      defaultValue: ''
    },
    defaultValue: {
      type: DataTypes.TEXT,
      field: 'default_value'
    }
  }, {
    tableName: 'MicroserviceTemplateVariables',
    timestamps: true,
    underscored: true
  })

  MicroserviceTemplateVariable.associate = function (models) {
    MicroserviceTemplateVariable.belongsTo(models.MicroserviceTemplate, {
      foreignKey: {
        name: 'microserviceTemplateId',
        field: 'microservice_template_id'
      },
      as: 'microserviceTemplate',
      onDelete: 'cascade'
    })
  }

  return MicroserviceTemplateVariable
}
