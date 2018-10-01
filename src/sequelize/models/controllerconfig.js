'use strict';
module.exports = (sequelize, DataTypes) => {
  const ControllerConfig = sequelize.define('ControllerConfig', {
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
    value: {
      type: DataTypes.TEXT,
      field: 'value'
    }
  }, {
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  ControllerConfig.associate = function(models) {
    // associations can be defined here
  };
  return ControllerConfig;
};