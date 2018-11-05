'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ChangeTrackings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      microserviceConfig: {
        type: Sequelize.BOOLEAN,
        field: 'container_config'
      },
      reboot: {
        type: Sequelize.BOOLEAN,
        field: 'reboot'
      },
      deletenode: {
        type: Sequelize.BOOLEAN,
        field: 'deletenode'
      },
      version: {
        type: Sequelize.BOOLEAN,
        field: 'version'
      },
      microserviceList: {
        type: Sequelize.BOOLEAN,
        field: 'container_list'
      },
      config: {
        type: Sequelize.BOOLEAN,
        field: 'config'
      },
      routing: {
        type: Sequelize.BOOLEAN,
        field: 'routing'
      },
      registries: {
        type: Sequelize.BOOLEAN,
        field: 'registries'
      },
      tunnel: {
        type: Sequelize.BOOLEAN,
        field: 'tunnel'
      },
      diagnostics: {
        type: Sequelize.BOOLEAN,
        field: 'diagnostics'
      },
      isImageSnapshot: {
        type: Sequelize.BOOLEAN,
        field: 'image_snapshot'
      },
      iofogUuid: {
        type: Sequelize.TEXT,
        field: 'iofog_uuid',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'cascade'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ChangeTrackings');
  }
};