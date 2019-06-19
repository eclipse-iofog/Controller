'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('FogVersionCommands', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      versionCommand: {
        /* eslint-disable new-cap */
        type: Sequelize.STRING(100),
        field: 'version_command',
      },
      iofogUuid: {
        type: Sequelize.TEXT,
        field: 'iofog_uuid',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'cascade',
      },
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('FogVersionCommands')
  },
}
