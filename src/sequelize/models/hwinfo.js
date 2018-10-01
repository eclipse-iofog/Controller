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
    freezeTableName: true,
    underscored: true
  });
  HWInfo.associate = function(models) {

    HWInfo.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid',
      as: 'iofogUuid',
      onDelete: 'cascade'
    });
  };
  return HWInfo;
};