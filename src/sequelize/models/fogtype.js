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
    timestamps: false,
    underscored: true
  });
  FogType.associate = function(models) {
    FogType.belongsTo(models.CatalogItem, {
      foreignKey: 'network_catalog_item_id',
      as: 'networkCatalogItemId'
    });

    FogType.belongsTo(models.CatalogItem, {
      foreignKey: 'hal_catalog_item_id',
      as: 'halCatalogItemId'
    });

    FogType.belongsTo(models.CatalogItem, {
      foreignKey: 'bluetooth_catalog_item_id',
      as: 'bluetoothCatalogItemId'
    });
  };
  return FogType;
};