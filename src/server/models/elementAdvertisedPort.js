/**
 * @file ElementAdvertisedPort.js
 * @author Zishan Iqbal
 * @description This file includes a element_advertised_port model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Element from './element';

const ElementAdvertisedPort = sequelize.define('element_advertised_port', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  portNumber: {
    type: Sequelize.BIGINT,
    field: 'port_number'
  },
  name: {
    type: Sequelize.TEXT,
    field: 'name'
  },
  description: {
    type: Sequelize.TEXT,
    field: 'description'
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

ElementAdvertisedPort.belongsTo(Element);

export default ElementAdvertisedPort;