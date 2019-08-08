'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('TrackingEvents', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      uuid: {
        type: Sequelize.TEXT,
        allowNull: false,
        field: 'uuid'
      },
      sourceType: {
        type: Sequelize.TEXT,
        field: 'source_type'
      },
      timestamp: {
        type: Sequelize.BIGINT,
        field: 'timestamp'
      },
      type: {
        type: Sequelize.TEXT,
        field: 'type'
      },
      data: {
        type: Sequelize.TEXT,
        field: 'data'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('TrackingEvents')
  }
}
