'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('ConnectorPorts', 'moved', {
      type: Sequelize.BOOLEAN,
      field: 'moved',
      defaultValue: false
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('ConnectorPorts', 'moved')
  }
}
