'use strict'
module.exports = (sequelize, DataTypes) => {
  const ApplicationTemplateVariable = sequelize.define('ApplicationTemplateVariable', {
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
    tableName: 'ApplicationTemplateVariables',
    timestamps: true,
    underscored: true
  })
  ApplicationTemplateVariable.associate = function (models) {
    ApplicationTemplateVariable.belongsTo(models.ApplicationTemplate, {
      foreignKey: {
        name: 'applicationTemplateId',
        field: 'application_template_id'
      },
      as: 'applicationTemplate',
      onDelete: 'cascade'
    })
  }
  return ApplicationTemplateVariable
}
