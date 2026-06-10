'use strict'
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
    tableName: 'CatalogItemImages',
    timestamps: false,
    underscored: true
  })
  CatalogItemImage.associate = function (models) {
    CatalogItemImage.belongsTo(models.CatalogItem, {
      foreignKey: {
        name: 'catalogItemId',
        field: 'catalog_item_id'
      },
      as: 'catalogItem',
      onDelete: 'cascade'
    })

    CatalogItemImage.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })

    CatalogItemImage.belongsTo(models.Architecture, {
      foreignKey: {
        name: 'archId',
        field: 'arch_id'
      },
      as: 'architecture',
      onDelete: 'cascade'
    })
  }
  return CatalogItemImage
}
