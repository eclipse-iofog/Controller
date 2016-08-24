/**
* @file routing.js
* @author Zishan Iqbal
* @description This file includes a routing model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const Routing = sequelize.define('routing', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  publishingInstanceId: {type: Sequelize.TEXT, field: 'publishing_instance_id'},
  publishingElementId: {type: Sequelize.TEXT, field: 'publishing_element_id'},
  destinationInstanceId: {type: Sequelize.TEXT, field: 'destination_instance_id'},
  destinationElementId: {type: Sequelize.TEXT, field: 'destination_element_id'},
  isNetworkConnection: {type: Sequelize.BOOLEAN, field: 'is_network_connection'},
  }, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

export default Routing;
