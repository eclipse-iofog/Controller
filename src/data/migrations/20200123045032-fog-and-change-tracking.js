'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return Promise.all([
      queryInterface.addColumn('Fogs', 'docker_pruning_freq', {
        type: Sequelize.INTEGER,
        defaultValue: 60,
        field: 'docker_pruning_freq'
      }),
      queryInterface.addColumn('Fogs', 'available_disk_threshold', {
        type: Sequelize.FLOAT,
        defaultValue: 20,
        field: 'available_disk_threshold'
      }),
      queryInterface.addColumn('Fogs', 'log_level', {
        type: Sequelize.TEXT,
        defaultValue: 'INFO',
        field: 'log_level'
      }),
      queryInterface.addColumn('ChangeTrackings', 'prune', {
        type: Sequelize.BOOLEAN,
        field: 'prune'
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    return Promise.all([
      queryInterface.removeColumn('Fogs', 'docker_pruning_freq'),
      queryInterface.removeColumn('Fogs', 'available_disk_threshold'),
      queryInterface.removeColumn('Fogs', 'log_level'),
      queryInterface.removeColumn('ChangeTrackings', 'prune')
    ])
  }
}
