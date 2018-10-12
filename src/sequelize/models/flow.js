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
      field: 'is_activated',
      defaultValue: false
    },
    isSelected: {
      type: DataTypes.BOOLEAN,
      field: 'is_selected',
      defaultValue: false
    }
  }, {
    timestamps: true,
    underscored: true
  });
  Flow.associate = function (models) {

    Flow.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    });

    Flow.belongsTo(models.User, {
      foreignKey: {
        name: 'updatedBy',
        field: 'updated_by'
      },
      as: 'userUpdatedBy',
      onDelete: 'set null'
    });
  };
  return Flow;
};