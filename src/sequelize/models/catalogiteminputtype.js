'use strict';
module.exports = (sequelize, DataTypes) => {
  const CatalogItemInputType = sequelize.define('CatalogItemInputType', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    infoType: {
      type: DataTypes.TEXT,
      field: 'info_type'
    },
    infoFormat: {
      type: DataTypes.TEXT,
      field: 'info_format'
    }
  }, {
    timestamps: false,
    underscored: true
  });
  CatalogItemInputType.associate = function(models) {

    CatalogItemInputType.belongsTo(models.CatalogItem, {
      foreignKey: {
        name: 'catalogItemId',
        field: 'catalog_item_id'
      },
      as: 'catalogItem'
    });
  };
  return CatalogItemInputType;
};