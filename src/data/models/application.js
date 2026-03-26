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
    },
    natsAccess: {
      type: DataTypes.BOOLEAN,
      field: 'nats_access',
      defaultValue: false
    },
    natsRuleId: {
      type: DataTypes.INTEGER,
      field: 'nats_rule_id',
      allowNull: true
    }
  }, {
    tableName: 'Flows',
    timestamps: true,
    underscored: true
  })
  Application.associate = function (models) {
    Application.hasMany(models.Microservice, {
      foreignKey: {
        name: 'applicationId',
        field: 'application_id'
      },
      as: 'microservices'
    })

    Application.belongsTo(models.NatsAccountRule, {
      foreignKey: {
        name: 'natsRuleId',
        field: 'nats_rule_id'
      },
      as: 'natsRule',
      onDelete: 'set null'
    })
  }
  return Application
}
