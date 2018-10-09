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
      foreignKey: {
        name: 'networkCatalogItemId',
        field: 'network_catalog_item_id'
      },
      as: 'networkCatalogItem'
    });

    FogType.belongsTo(models.CatalogItem, {
      foreignKey: {
        name: 'halCatalogItemId',
        field: 'hal_catalog_item_id'
      },
      as: 'halCatalogItem'
    });

    FogType.belongsTo(models.CatalogItem, {
      foreignKey: {
        name: 'bluetoothCatalogItemId',
        field: 'bluetooth_catalog_item_id'
      },
      as: 'bluetoothCatalogItem'
    });
  };
  return FogType;
};