'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('CatalogItemImages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      containerImage: {
        type: Sequelize.TEXT,
        field: 'container_image'
      },
      catalogItemId: {
        type: Sequelize.INTEGER,
        field: 'catalog_item_id',
        references: { model: 'CatalogItems', key: 'id' },
        onDelete: 'cascade'
      },
      fogTypeId: {
        type: Sequelize.INTEGER,
        field: 'fog_type_id',
        references: { model: 'FogTypes', key: 'id' },
        onDelete: 'cascade'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('CatalogItemImages')
  }
}
