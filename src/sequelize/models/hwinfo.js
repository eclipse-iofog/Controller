'use strict';
module.exports = (sequelize, DataTypes) => {
  const HWInfo = sequelize.define('HWInfo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    info: {
      type: DataTypes.TEXT,
      defaultValue: " ",
      field: 'info'
    }
  }, {
    // add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  HWInfo.associate = function(models) {
    // associations can be defined here
    HWInfo.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid',
      as: 'iofogUuid',
      onDelete: 'cascade'
    });
  };
  return HWInfo;
};