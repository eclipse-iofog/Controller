'use strict';
module.exports = (sequelize, DataTypes) => {
  const CatalogItem = sequelize.define('CatalogItem', {
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
    description: {
      type: DataTypes.TEXT,
      field: 'description'
    },
    category: {
      type: DataTypes.TEXT,
      field: 'category'
    },
    configExample: {
      type: DataTypes.TEXT,
      field: 'config_example'
    },
    publisher: {
      type: DataTypes.TEXT,
      field: 'publisher'
    },
    diskRequired: {
      type: DataTypes.BIGINT,
      field: 'disk_required'
    },
    ramRequired: {
      type: DataTypes.BIGINT,
      field: 'ram_required'
    },
    picture: {
      type: DataTypes.TEXT,
      field: 'picture'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      field: 'is_public'
    }
  }, {
    timestamps: false,
    underscored: true
  });
  CatalogItem.associate = function(models) {

    CatalogItem.belongsTo(models.Registry, {
      foreignKey: {
        name: 'registryId',
        field: 'registry_id'
      },
      as: 'registry',
      onDelete: 'set null'
    });

    CatalogItem.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    });

	  CatalogItem.hasMany(models.CatalogItemImage, {
      foreignKey: 'catalog_item_id',
      as: 'images'
	  });

	  CatalogItem.hasOne(models.CatalogItemInputType, {
		  foreignKey: 'catalog_item_id',
		  as: 'inputType'
	  });

	  CatalogItem.hasOne(models.CatalogItemOutputType, {
		  foreignKey: 'catalog_item_id',
		  as: 'outputType'
	  });
  };
  return CatalogItem;
};