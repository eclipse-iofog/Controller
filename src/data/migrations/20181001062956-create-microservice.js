'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Microservices', {
      uuid: {
        type: Sequelize.STRING(32),
        primaryKey: true,
        allowNull: false,
        field: 'uuid'
      },
      config: {
        type: Sequelize.TEXT,
        field: 'config'
      },
      name: {
        type: Sequelize.TEXT,
        field: 'name'
      },
      configLastUpdated: {
        type: Sequelize.BIGINT,
        get () {
          return convertToInt(this.getDataValue('configLastUpdated'))
        },
        field: 'config_last_updated'
      },
      isNetwork: {
        type: Sequelize.BOOLEAN,
        field: 'is_network'
      },
      needUpdate: {
        type: Sequelize.BOOLEAN,
        field: 'need_update'
      },
      rebuild: {
        type: Sequelize.BOOLEAN,
        field: 'rebuild'
      },
      rootHostAccess: {
        type: Sequelize.BOOLEAN,
        field: 'root_host_access'
      },
      logSize: {
        type: Sequelize.BIGINT,
        get () {
          return convertToInt(this.getDataValue('logSize'))
        },
        field: 'log_size'
      },
      imageSnapshot: {
        type: Sequelize.TEXT,
        field: 'image_snapshot'
      },
      deleteWithCleanup: {
        type: Sequelize.BOOLEAN,
        field: 'delete_with_cleanup'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'created_at'
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updated_at'
      },
      iofogUuid: {
        type: Sequelize.STRING(32),
        field: 'iofog_uuid',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'set null'
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        field: 'updated_by',
        references: { model: 'Users', key: 'id' },
        onDelete: 'set null'
      },
      catalogItemId: {
        type: Sequelize.INTEGER,
        field: 'catalog_item_id',
        references: { model: 'CatalogItems', key: 'id' },
        onDelete: 'cascade'
      },
      registryId: {
        type: Sequelize.INTEGER,
        field: 'registry_id',
        references: { model: 'Registries', key: 'id' },
        onDelete: 'cascade',
        defaultValue: 1
      },
      flowId: {
        type: Sequelize.INTEGER,
        field: 'flow_id',
        references: { model: 'Flows', key: 'id' },
        onDelete: 'cascade'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Microservices')
  }
}
