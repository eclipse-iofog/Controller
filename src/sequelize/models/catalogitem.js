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
    config: {
      type: DataTypes.TEXT,
      field: 'config'
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
      foreignKey: 'registry_id',
      as: 'registryId',
      onDelete: 'set null'
    });

    CatalogItem.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'userId',
      onDelete: 'cascade'
    });

  };
  return CatalogItem;
};