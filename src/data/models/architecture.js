'use strict'
module.exports = (sequelize, DataTypes) => {
  const Architecture = sequelize.define('Architecture', {
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
    tableName: 'Architectures',
    timestamps: false,
    underscored: true
  })
  Architecture.associate = function (models) {
    Architecture.belongsTo(models.CatalogItem, {
      foreignKey: {
        name: 'networkCatalogItemId',
        field: 'network_catalog_item_id'
      },
      as: 'networkCatalogItem'
    })
  }
  return Architecture
}
