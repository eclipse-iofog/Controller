'use strict'

module.exports = (sequelize, DataTypes) => {
  const MicroserviceTemplate = sequelize.define('MicroserviceTemplate', {
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
      unique: true,
      field: 'name'
    },
    description: {
      type: DataTypes.TEXT,
      field: 'description',
      defaultValue: ''
    },
    microserviceJSON: {
      type: DataTypes.TEXT,
      field: 'microservice_json',
      defaultValue: '{}'
    }
  }, {
    tableName: 'MicroserviceTemplates',
    timestamps: true,
    underscored: true
  })

  MicroserviceTemplate.associate = function (models) {
    MicroserviceTemplate.hasMany(models.MicroserviceTemplateVariable, {
      foreignKey: {
        name: 'microserviceTemplateId',
        field: 'microservice_template_id'
      },
      as: 'variables'
    })
  }

  return MicroserviceTemplate
}
