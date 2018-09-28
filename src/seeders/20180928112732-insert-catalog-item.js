'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
   return queryInterface.bulkInsert('CatalogItem', [
	   {
			ID: 1,
			name: 'Networking Tool',
			description: 'The built-in networking tool for Eclipse ioFog.',
			category: 'SYSTEM',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'none.png',
			config: null,
			is_public: 0,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 2,
			name: 'RESTBlue',
			description: 'REST API for Bluetooth Low Energy layer.',
			category: 'SYSTEM',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'none.png',
			config: null,
			is_public: 0,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 3,
			name: 'HAL',
			description: 'REST API for Hardware Abstraction layer.',
			category: 'SYSTEM',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'none.png',
			config: null,
			is_public: 0,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 4,
			name: 'Diagnostics',
			description: '0',
			category: 'UTILITIES',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'images/build/580.png',
			config: null,
			is_public: 1,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 5,
			name: 'Hello Web Demo',
			description: 'A simple web server to test Eclipse ioFog.',
			category: 'UTILITIES',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'images/build/4.png',
			config: null,
			is_public: 1,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 6,
			name: 'Open Weather Map Data',
			description: 'A stream of data from the Open Weather Map API in JSON format',
			category: 'SENSORS',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'images/build/8.png',
			config: null,
			is_public: 1,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 7,
			name: 'JSON REST API',
			description: 'A configurable REST API that gives JSON output',
			category: 'UTILITIES',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'images/build/49.png',
			config: null,
			is_public: 1,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 8,
			name: 'Temperature Converter',
			description: 'A simple temperature format converter',
			category: 'UTILITIES',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'images/build/58.png',
			config: null,
			is_public: 1,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 9,
			name: 'JSON Sub-Select',
			description: 'Performs sub-selection and transform operations on any JSON messages',
			category: 'UTILITIES',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'images/build/59.png',
			config: null,
			is_public: 1,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 10,
			name: 'Humidity Sensor Simulator',
			description: 'Humidity Sensor Simulator for Eclipse ioFog',
			category: 'SIMULATOR',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'images/build/simulator.png',
			config: null,
			is_public: 1,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 11,
			name: 'Seismic Sensor Simulator',
			description: 'Seismic Sensor Simulator for Eclipse ioFog',
			category: 'SIMULATOR',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'images/build/simulator.png',
			config: null,
			is_public: 1,
			registry_id: 1,
			user_id: null
	   },
	   {
			ID: 12,
			name: 'Temperature Sensor Simulator',
			description: 'Temperature Sensor Simulator for Eclipse ioFog',
			category: 'SIMULATOR',
			publisher: 'Eclipse ioFog',
			disk_required: 0,
			ram_required: 0,
			picture: 'images/build/simulator.png',
			config: null,
			is_public: 1,
			registry_id: 1,
			user_id: null
	   }
   ]);
  },
  
  
  down: (queryInterface, Sequelize) => {
        return queryInterface.bulkDelete('CatalogItem', null, {});
  }
};


