'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('FogTypes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      name: {
        type: Sequelize.TEXT,
        field: 'name'
      },
      image: {
        type: Sequelize.TEXT,
        field: 'image'
      },
      description: {
        type: Sequelize.TEXT,
        field: 'description'
      },
      networkCatalogItemId: {
        type: Sequelize.INTEGER,
        field: 'network_catalog_item_id',
        references: { model: 'CatalogItems', key: 'id' },
        onDelete: 'cascade'
      },
      halCatalogItemId: {
        type: Sequelize.INTEGER,
        field: 'hal_catalog_item_id',
        references: { model: 'CatalogItems', key: 'id' },
        onDelete: 'cascade'
      },
      bluetoothCatalogItemId: {
        type: Sequelize.INTEGER,
        field: 'bluetooth_catalog_item_id',
        references: { model: 'CatalogItems', key: 'id' },
        onDelete: 'cascade'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('FogTypes')
  }
}
