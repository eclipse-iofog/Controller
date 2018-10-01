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
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  FogType.associate = function(models) {
    // associations can be defined here
  };
  return FogType;
};