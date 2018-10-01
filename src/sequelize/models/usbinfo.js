'use strict';
module.exports = (sequelize, DataTypes) => {
  const USBInfo = sequelize.define('USBInfo', {
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
    freezeTableName: true,
    underscored: true
  });
  USBInfo.associate = function(models) {

    USBInfo.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid',
      as: 'iofogUuid',
      onDelete: 'cascade'
    });
  };
  return USBInfo;
};