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
    isSelected: {
      type: DataTypes.INTEGER,
      field: 'is_selected'
    },
    isActivated: {
      type: DataTypes.INTEGER,
      field: 'is_activated'
    }
  }, {
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  Flow.associate = function(models) {
    // associations can be defined here
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