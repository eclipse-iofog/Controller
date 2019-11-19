'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('MicroserviceStatuses',
      'operating_duration',
      Sequelize.BIGINT
    )
      .then(() => queryInterface.addColumn('MicroserviceStatuses',
        'start_time',
        Sequelize.BIGINT))
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('MicroserviceStatuses', 'operating_duration')
      .then(() => queryInterface.removeColumn('MicroserviceStatuses', 'start_time'))
  }
}
