'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
        field: 'id'
      },
      firstName: {
        type: Sequelize.STRING(100),
        field: 'first_name'
      },
      lastName: {
        type: Sequelize.STRING(100),
        field: 'last_name'
      },
      email: {
        type: Sequelize.STRING(100),
        field: 'email'
      },
      password: {
        type: Sequelize.STRING(100),
        field: 'password'
      },
      tempPassword: {
        type: Sequelize.STRING(100),
        field: 'temp_password'
      },
      emailActivated: {
        type: Sequelize.BOOLEAN,
        field: 'email_activated'
      },
      userAccessToken: {
        type: Sequelize.TEXT,
        field: 'user_access_token'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Users');
  }
};