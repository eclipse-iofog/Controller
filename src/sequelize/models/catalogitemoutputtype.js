'use strict';
module.exports = (sequelize, DataTypes) => {
  const CatalogItemOutputType = sequelize.define('CatalogItemOutputType', {
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
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  CatalogItemOutputType.associate = function(models) {
    // associations can be defined here
    CatalogItemOutputType.belongsTo(models.CatalogItem, {
      foreignKey: 'catalog_item_id',
      as: 'catalogItemId'
    });
  };
  return CatalogItemOutputType;
};