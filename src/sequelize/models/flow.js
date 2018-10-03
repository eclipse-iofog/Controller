'use strict';
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
      field: 'name'
    },
    description: {
      type: DataTypes.TEXT,
      field: 'description'
    },
    isActivated: {
      type: DataTypes.BOOLEAN,
      field: 'is_activated'
    }
  }, {
    timestamps: true,
    underscored: true
  });
  Flow.associate = function(models) {

    Flow.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'userId',
      onDelete: 'cascade'
    });

    Flow.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updatedBy',
      onDelete: 'set null'
    });
  };
  return Flow;
};