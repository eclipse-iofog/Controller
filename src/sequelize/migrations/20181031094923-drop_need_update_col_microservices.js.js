'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Microservices', 'need_update');
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Microservices',
      'need_update',
      Sequelize.BOOLEAN
    );
  }
};
