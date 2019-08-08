'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('ChangeTrackings', 'container_config', 'microservice_config')
      .then(() => {
        return queryInterface.renameColumn('ChangeTrackings', 'container_list', 'microservice_list')
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('ChangeTrackings', 'microservice_config', 'container_config')
      .then(() => {
        return queryInterface.renameColumn('ChangeTrackings', 'microservice_list', 'container_list')
      })
  }
}
