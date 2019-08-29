'use strict'

const { convertToInt } = require('../../helpers/app-helper')

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
        get () {
          return convertToInt(this.getDataValue('timestamp'))
        },
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
