'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AccessTokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      token: {
        type: Sequelize.STRING,
        field: 'token'
      },
      expirationTime: {
        type: Sequelize.BIGINT,
        field: 'expiration_time'
      },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: {model: 'Users', key: 'id'},
        onDelete: 'cascade'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AccessTokens');
  }
};