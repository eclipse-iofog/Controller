'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
   return queryInterface.bulkInsert('CatalogItemImage', [
	   {
			ID: 1,
			catalog_item_id: 1,
			iofog_type_id: 1,
			container_image: 'iofog/core-networking'
	   },
	   {
			ID: 2,
			catalog_item_id: 1,
			iofog_type_id: 2,
			container_image: 'iofog/core-networking-arm'
	   },
	   {
			ID: 3,
			catalog_item_id: 2,
			iofog_type_id: 1,
			container_image: 'iofog/restblue'
	   },
	   {
			ID: 4,
			catalog_item_id: 2,
			iofog_type_id: 2,
			container_image: 'iofog/restblue-arm'
	   },
	   {
			ID: 5,
			catalog_item_id: 3,
			iofog_type_id: 1,
			container_image: 'iofog/hal'
	   },
	   {
			ID: 6,
			catalog_item_id: 3,
			iofog_type_id: 2,
			container_image: 'iofog/hal-arm'
	   },
	   {
			ID: 7,
			catalog_item_id: 4,
			iofog_type_id: 1,
			container_image: 'iofog/diagnostics'
	   },
	   {
			ID: 8,
			catalog_item_id: 4,
			iofog_type_id: 2,
			container_image: 'iofog/diagnostics-arm'
	   },
	   {
			ID: 9,
			catalog_item_id: 5,
			iofog_type_id: 1,
			container_image: 'iofog/hello-web'
	   },
	   {
			ID: 10,
			catalog_item_id: 5,
			iofog_type_id: 2,
			container_image: 'iofog/hello-web-arm'
	   },
	   {
			ID: 11,
			catalog_item_id: 6,
			iofog_type_id: 1,
			container_image: 'iofog/open-weather-map'
	   },
	   {
			ID: 12,
			catalog_item_id: 6,
			iofog_type_id: 2,
			container_image: 'iofog/open-weather-map-arm'
	   },
	   {
			ID: 13,
			catalog_item_id: 7,
			iofog_type_id: 1,
			container_image: 'iofog/json-rest-api'
	   },
	   {
			ID: 14,
			catalog_item_id: 7,
			iofog_type_id: 2,
			container_image: 'iofog/json-rest-api-arm'
	   },
	   {
			ID: 15,
			catalog_item_id: 8,
			iofog_type_id: 1,
			container_image: 'iofog/temperature-conversion'
	   },
	   {
			ID: 16,
			catalog_item_id: 8,
			iofog_type_id: 2,
			container_image: 'iofog/temperature-conversion-arm'
	   },
	   {
			ID: 17,
			catalog_item_id: 9,
			iofog_type_id: 1,
			container_image: 'iofog/json-subselect'
	   },
	   {
			ID: 18,
			catalog_item_id: 9,
			iofog_type_id: 2,
			container_image: 'iofog/json-subselect-arm'
	   },
	   {
			ID: 19,
			catalog_item_id: 10,
			iofog_type_id: 1,
			container_image: 'iofog/humidity-sensor-simulator'
	   },
	   {
			ID: 20,
			catalog_item_id: 10,
			iofog_type_id: 2,
			container_image: 'iofog/humidity-sensor-simulator-arm'
	   },
	   {
			ID: 21,
			catalog_item_id: 11,
			iofog_type_id: 1,
			container_image: 'iofog/seismic-sensor-simulator'
	   },
	   {
			ID: 22,
			catalog_item_id: 11,
			iofog_type_id: 2,
			container_image: 'iofog/seismic-sensor-simulator-arm'
	   },
	   {
			ID: 23,
			catalog_item_id: 12,
			iofog_type_id: 1,
			container_image: 'iofog/temperature-sensor-simulator'
	   },
	   {
			ID: 24,
			catalog_item_id: 12,
			iofog_type_id: 2,
			container_image: 'iofog/temperature-sensor-simulator-arm'
	   }
   ]);
  },
  
  
  down: (queryInterface, Sequelize) => {
        return queryInterface.bulkDelete('CatalogItemImage', null, {});
  }
};