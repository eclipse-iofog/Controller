'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('SchedulerAccessTokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      expirationTime: {
        type: Sequelize.BIGINT,
        get () {
          return convertToInt(this.getDataValue('expirationTime'))
        },
        field: 'expiration_time'
      },
      token: {
        type: Sequelize.TEXT,
        field: 'token'
      },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: { model: 'Users', key: 'id' },
        onDelete: 'cascade'
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('SchedulerAccessTokens')
  }
}
