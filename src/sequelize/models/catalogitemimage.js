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
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  CatalogItemImage.associate = function(models) {
    // associations can be defined here
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