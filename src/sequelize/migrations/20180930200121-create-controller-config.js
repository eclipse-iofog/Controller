'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ControllerConfigs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      key: {
        type: Sequelize.TEXT,
        field: 'key'
      },
      value: {
        type: Sequelize.TEXT,
        field: 'value'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ControllerConfigs');
  }
};