'use strict'
module.exports = (sequelize, DataTypes) => {
  const Flow = sequelize.define('Flow', {
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
      defaultValue: 'New Flow'
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
    }
  }, {
    timestamps: true,
    underscored: true
  })
  Flow.associate = function (models) {
    Flow.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    })

    Flow.hasMany(models.Microservice, {
      foreignKey: {
        name: 'flowId',
        field: 'flow_id'
      },
      as: 'microservices'
    })
  }
  return Flow
}
