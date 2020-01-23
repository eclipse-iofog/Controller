'use strict'

const constants = require('../constants')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('FogTypes', [
      {
        id: constants.FOG_TYPE_UNSPECIFIED,
        name: 'Unspecified',
        image: 'iointegrator0.png',
        description: 'Unspecified device. Fog Type will be selected on provision',
        network_catalog_item_id: 1,
        hal_catalog_item_id: 3,
        bluetooth_catalog_item_id: 2
      },
      {
        id: constants.FOG_TYPE_X86,
        name: 'Standard Linux (x86)',
        image: 'iointegrator1.png',
        description: 'A standard Linux server of at least moderate processing power and capacity. ' +
        'Compatible with common Linux types such as Ubuntu, Red Hat, and CentOS.',
        network_catalog_item_id: 1,
        hal_catalog_item_id: 3,
        bluetooth_catalog_item_id: 2
      },
      {
        id: constants.FOG_TYPE_ARM,
        name: 'ARM Linux',
        image: 'iointegrator2.png',
        description: 'A version of ioFog meant to run on Linux systems with ARM processors. ' +
        'Microservices for this ioFog type will be tailored to ARM systems.',
        network_catalog_item_id: 1,
        hal_catalog_item_id: 3,
        bluetooth_catalog_item_id: 2
      }
    ]).then(() => {
      return queryInterface.bulkUpdate('Fogs',
        {
          fog_type_id: 0
        },
        {
          fog_type_id: null
        }
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FogTypes', null, {})
  }
}
