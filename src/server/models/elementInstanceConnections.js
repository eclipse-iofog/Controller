/**
 * @file elementinstancePort.js
 * @author Zishan Iqbal
 * @description This file includes a element_instance_connections model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const ElementInstanceConnections = sequelize.define('element_instance_connections', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  sourceElementInstance: {
    type: Sequelize.BIGINT,
    field: 'source_element_instance'
  },
  destinationElementInstance: {
    type: Sequelize.BIGINT,
    field: 'destination_element_instance'
  },
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});


export default ElementInstanceConnections;