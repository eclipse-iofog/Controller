'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MicroserviceArgs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      cmd: {
        type: Sequelize.TEXT,
        field: 'cmd'
      },
      microserviceUuid: {
        type: Sequelize.TEXT,
        field: 'microservice_uuid',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MicroserviceArgs')
  }
}
