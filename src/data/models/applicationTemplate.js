'use strict'
module.exports = (sequelize, DataTypes) => {
  const ApplicationTemplate = sequelize.define('ApplicationTemplate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    name: {
      type: DataTypes.TEXT,
      field: 'name',
      defaultValue: 'new-application',
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      field: 'description',
      defaultValue: ''
    },
    schemaVersion: {
      type: DataTypes.TEXT,
      field: 'schema_version',
      defaultValue: ''
    },
    applicationJSON: {
      type: DataTypes.TEXT,
      field: 'application_json',
      defaultValue: '{}'
    }
  }, {
    tableName: 'ApplicationTemplates',
    timestamps: true,
    underscored: true
  })
  ApplicationTemplate.associate = function (models) {
    ApplicationTemplate.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    })
    ApplicationTemplate.hasMany(models.ApplicationTemplateVariable, {
      foreignKey: {
        name: 'applicationTemplateId',
        field: 'application_template_id'
      },
      as: 'variables'
    })
  }
  return ApplicationTemplate
}
