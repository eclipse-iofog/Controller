'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Tags', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      value: {
        type: Sequelize.TEXT,
        field: 'value',
        unique: true,
        allowNull: false
      }
    })
    await queryInterface.createTable('IofogTags', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      TagId: {
        type: Sequelize.INTEGER,
        field: 'tag_id',
        references: { model: 'Tags', key: 'id' },
        onDelete: 'cascade'
      },
      FogUuid: {
        type: Sequelize.INTEGER,
        field: 'fog_uuid',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'cascade'
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Tags')
    await queryInterface.dropTable('IofogTags')
  }
}
