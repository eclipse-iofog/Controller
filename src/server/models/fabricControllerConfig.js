/**
 * @file sslFiles.js
 * @author Zishan Iqbal
 * @description This file includes a element model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const fabricControllerConfig = sequelize.define('config', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  key: {
    type: Sequelize.TEXT,
    field: 'key'
  },
  value: {
    type: Sequelize.TEXT,
    field: 'value'
  }
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

export default fabricControllerConfig;