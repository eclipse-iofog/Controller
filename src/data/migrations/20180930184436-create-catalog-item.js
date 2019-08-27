'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('CatalogItems', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      name: {
        type: Sequelize.TEXT,
        field: 'name',
        defaultValue: 'New Catalog Item'
      },
      description: {
        type: Sequelize.TEXT,
        field: 'description',
        defaultValue: ''
      },
      category: {
        type: Sequelize.TEXT,
        field: 'category'
      },
      configExample: {
        type: Sequelize.TEXT,
        field: 'config_example',
        defaultValue: '{}'
      },
      publisher: {
        type: Sequelize.TEXT,
        field: 'publisher'
      },
      diskRequired: {
        type: Sequelize.INTEGER,
        field: 'disk_required',
        defaultValue: 0
      },
      ramRequired: {
        type: Sequelize.INTEGER,
        field: 'ram_required',
        defaultValue: 0
      },
      picture: {
        type: Sequelize.TEXT,
        field: 'picture',
        defaultValue: 'images/shared/default.png'
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        field: 'is_public',
        defaultValue: false
      },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: { model: 'Users', key: 'id' },
        onDelete: 'cascade'
      },
      registryId: {
        type: Sequelize.INTEGER,
        field: 'registry_id',
        as: 'registryId',
        references: { model: 'Registries', key: 'id' },
        onDelete: 'set null',
        defaultValue: 1
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('CatalogItems')
  }
}
