/**
* @file elementinstancePort.js
* @author Zishan Iqbal
* @description This file includes a element_instance_port model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Element from './element';

const ElementInstancePort = sequelize.define('element_instance_port', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  // elementId: {type: Sequelize.TEXT, field: 'elementId'},
  portInternal: {type: Sequelize.BIGINT, field: 'port_internal'},
  portExternal: {type: Sequelize.BIGINT, field: 'port_external'},
  updatedBy: {type: Sequelize.BIGINT, field: 'updated_by'},
  }, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: true,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

ElementInstancePort.belongsTo(Element);

export default ElementInstancePort;
