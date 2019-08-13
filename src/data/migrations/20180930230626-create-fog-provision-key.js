'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('FogProvisionKeys', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      provisionKey: {
        /* eslint-disable new-cap */
        type: Sequelize.STRING(100),
        field: 'provisioning_string'
      },
      expirationTime: {
        type: Sequelize.BIGINT,
        field: 'expiration_time'
      },
      iofogUuid: {
        type: Sequelize.STRING(32),
        field: 'iofog_uuid',
        references: { model: 'Fogs', key: 'uuid' },
        onDelete: 'cascade'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('FogProvisionKeys')
  }
}
