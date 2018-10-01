'use strict';
module.exports = (sequelize, DataTypes) => {
  const FogType = sequelize.define('FogType', {
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
    image: {
      type: DataTypes.TEXT,
      field: 'image'
    },
    description: {
      type: DataTypes.TEXT,
      field: 'description'
    }
  }, {
    timestamps: false,
    freezeTableName: true,
    underscored: true
  });
  FogType.associate = function(models) {

  };
  return FogType;
};