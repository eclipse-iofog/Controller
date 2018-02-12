/**
* @file fogType.js
* @author Zishan Iqbal
* @description This file includes a fog_type model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const FogType = sequelize.define('iofog_type', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  name: {type: Sequelize.TEXT, field: 'Name'},
  image: {type: Sequelize.TEXT, field: 'Image'},
  description: {type: Sequelize.TEXT, field: 'Description'},
  streamViewerElementKey: {type: Sequelize.BIGINT, field: 'StreamViewerElementKey'},
  consoleElementKey: {type: Sequelize.BIGINT, field: 'consoleElementKey'},
  networkElementKey: {type: Sequelize.BIGINT, field: 'NetworkElementKey'},
  halElementKey: {type: Sequelize.BIGINT, field: 'HalElementKey'},
  bluetoothElementKey: {type: Sequelize.BIGINT, field: 'BluetoothElementKey'},
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

export default FogType;
