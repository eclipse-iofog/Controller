'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Fogs', 'message_speed', {
      type: Sequelize.FLOAT,
      field: 'message_speed'
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Fogs', 'message_speed', {
      type: Sequelize.BIGINT,
      get () {
        return convertToInt(this.getDataValue('messageSpeed'))
      },
      field: 'message_speed'
    })
  }
}
