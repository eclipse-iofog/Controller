'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('MicroservicePorts', 'updated_by', 'user_id')
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('MicroservicePorts', 'user_id', 'updated_by')
  }
};
