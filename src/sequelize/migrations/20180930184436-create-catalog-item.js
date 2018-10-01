'use strict';
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
        field: 'name'
      },
      description: {
        type: Sequelize.TEXT,
        field: 'description'
      },
      category: {
        type: Sequelize.TEXT,
        field: 'category'
      },
      config: {
        type: Sequelize.TEXT,
        field: 'config'
      },
      publisher: {
        type: Sequelize.TEXT,
        field: 'publisher'
      },
      diskRequired: {
        type: Sequelize.BIGINT,
        field: 'disk_required'
      },
      ramRequired: {
        type: Sequelize.BIGINT,
        field: 'ram_required'
      },
      picture: {
        type: Sequelize.TEXT,
        field: 'picture'
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        field: 'is_public'
      },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: { model: 'User', key: 'id' },
        onDelete: 'cascade'
      },
      registryId: {
        type: Sequelize.INTEGER,
        field: 'registry_id',
        references: { model: 'Registry', key: 'id' },
        onDelete: 'set null'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('CatalogItems');
  }
};