'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('EmailActivationCodes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      activationCode: {
        type: Sequelize.TEXT,
        field: 'activation_code'
      },
      expirationTime: {
        type: Sequelize.BIGINT,
        field: 'expiration_time'
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
    return queryInterface.dropTable('EmailActivationCodes')
  }
}
