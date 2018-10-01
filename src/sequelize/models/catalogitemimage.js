'use strict';
module.exports = (sequelize, DataTypes) => {
  const CatalogItemImage = sequelize.define('CatalogItemImage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    containerImage: {
      type: DataTypes.TEXT,
      field: 'container_image'
    }
  }, {
    timestamps: false,
    underscored: true
  });
  CatalogItemImage.associate = function(models) {

    CatalogItemImage.belongsTo(models.CatalogItem, {
      foreignKey: 'catalog_item_id',
      as: 'catalogItemId',
      onDelete: 'cascade'
    });
    CatalogItemImage.belongsTo(models.FogType, {
      foreignKey: 'iofog_type_id',
      as: 'fogTypeId',
      onDelete: 'cascade'
    });

  };
  return CatalogItemImage;
};