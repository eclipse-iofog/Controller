'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
        field: 'id',
      },
      firstName: {
        /* eslint-disable new-cap */
        type: Sequelize.STRING(100),
        field: 'first_name',
        defaultValue: '',
      },
      lastName: {
        /* eslint-disable new-cap */
        type: Sequelize.STRING(100),
        field: 'last_name',
        defaultValue: '',
      },
      email: {
        /* eslint-disable new-cap */
        type: Sequelize.STRING(100),
        field: 'email',
        defaultValue: '',
      },
      password: {
        /* eslint-disable new-cap */
        type: Sequelize.STRING(100),
        field: 'password',
      },
      tempPassword: {
        /* eslint-disable new-cap */
        type: Sequelize.STRING(100),
        field: 'temp_password',
      },
      emailActivated: {
        type: Sequelize.BOOLEAN,
        field: 'email_activated',
        defaultValue: false,
      },
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Users')
  },
}
