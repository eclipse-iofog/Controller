'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('FogTypes', {
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
      image: {
        type: Sequelize.TEXT,
        field: 'image'
      },
      description: {
        type: Sequelize.TEXT,
        field: 'description'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('FogTypes');
  }
};