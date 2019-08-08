'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Connectors', {
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
      domain: {
        type: Sequelize.TEXT,
        field: 'domain'
      },
      publicIp: {
        type: Sequelize.TEXT,
        field: 'public_ip'
      },
      cert: {
        type: Sequelize.TEXT,
        field: 'cert'
      },
      selfSignedCerts: {
        type: Sequelize.BOOLEAN,
        field: 'self_signed_certs'
      },
      devMode: {
        type: Sequelize.BOOLEAN,
        field: 'dev_mode'
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
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Connectors')
  }
}
