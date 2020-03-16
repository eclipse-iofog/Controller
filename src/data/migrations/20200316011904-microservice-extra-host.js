'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MicroserviceExtraHost', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      name: {
        type: Sequelize.TEXT
      },
      templateType: {
        type: Sequelize.TEXT,
        field: 'template_type'
      },
      publicPort: {
        type: Sequelize.INTEGER,
        field: 'public_port'
      }, // Only if type is Apps
      template: {
        type: Sequelize.TEXT
      }, // Contains the template string
      value: {
        type: Sequelize.TEXT
      },
      microserviceUuid: {
        type: Sequelize.STRING(32),
        field: 'microservice_uuid',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      },
      targetMicroserviceUuid: {
        type: Sequelize.STRING(32),
        field: 'target_microservice_uuid',
        references: { model: 'Microservices', key: 'uuid' },
        onDelete: 'cascade'
      },
      targetFogUuid: {
        type: Sequelize.STRING(32),
        field: 'target_fog_uuid',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'cascade'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MicroserviceExtraHost')
  }
}
