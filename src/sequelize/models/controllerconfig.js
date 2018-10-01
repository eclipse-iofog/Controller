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
    timestamps: false,
    underscored: true
  });
  ControllerConfig.associate = function(models) {

  };
  return ControllerConfig;
};