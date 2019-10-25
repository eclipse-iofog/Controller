'use strict'
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
    tableName: 'CatalogItemOutputTypes',
    timestamps: false,
    underscored: true
  })
  CatalogItemOutputType.associate = function (models) {
    CatalogItemOutputType.belongsTo(models.CatalogItem, {
      foreignKey: {
        name: 'catalogItemId',
        field: 'catalog_item_id'
      },
      as: 'catalogItem'
    })
  }
  return CatalogItemOutputType
}
