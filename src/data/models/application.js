'use strict'
module.exports = (sequelize, DataTypes) => {
  const Application = sequelize.define('Application', {
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
    isActivated: {
      type: DataTypes.BOOLEAN,
      field: 'is_activated',
      defaultValue: false
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      field: 'is_system',
      defaultValue: false
    }
  }, {
    tableName: 'Flows',
    timestamps: true,
    underscored: true
  })
  Application.associate = function (models) {
    Application.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    })

    Application.hasMany(models.Microservice, {
      foreignKey: {
        name: 'applicationId',
        field: 'application_id'
      },
      as: 'microservices'
    })
  }
  return Application
}
