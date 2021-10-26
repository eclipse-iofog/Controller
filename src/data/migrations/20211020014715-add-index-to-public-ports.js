'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('MicroservicePublicPorts',
      {
        fields: ['public_port', 'host_id'],
        type: 'unique',
        name: 'port_host_unique_constraint'
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint('MicroservicePublicPorts', 'port_host_unique_constraint')
  }
}
