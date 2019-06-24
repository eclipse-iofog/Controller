'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MicroserviceEnvs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id',
      },
      key: {
        type: Sequelize.TEXT,
        field: 'key',
      },
      value: {
        type: Sequelize.TEXT,
        field: 'value',
      },
      microserviceUuid: {
        type: Sequelize.TEXT,
        field: 'microservice_uuid',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade',
      },
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MicroserviceEnvs')
  },
}
