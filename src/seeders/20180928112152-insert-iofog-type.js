'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('FogType', [
      {
        ID: 0,
        name: 'Unspecified',
        image: 'iointegrator0.png',
        description: 'Unspecified device. Fog Type will be selected on provision',
        network_catalog_item: 1,
        hal_catalog_item: 3,
        bluetooth_catalog_item: 2
      },
      {
        ID: 1,
        name: 'Standard Linux (x86)',
        image: 'iointegrator1.png',
        description: 'A standard Linux server of at least moderate processing power and capacity. Compatible with common Linux types such as Ubuntu, Red Hat, and CentOS.',
        network_catalog_item: 1,
        hal_catalog_item: 3,
        bluetooth_catalog_item: 2
      },
      {
        ID: 2,
        name: 'ARM Linux',
        image: 'iointegrator2.png',
        description: 'A version of ioFog meant to run on Linux systems with ARM processors. Microservices for this ioFog type will be tailored to ARM systems.',
        network_catalog_item: 1,
        hal_catalog_item: 3,
        bluetooth_catalog_item: 2
      }
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FogType', null, {});
  }
};