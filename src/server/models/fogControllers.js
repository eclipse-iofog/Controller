/**
 * @file fog.js
 * @author Zishan Iqbal
 * @description This file includes a iofogs model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const FogControllers = sequelize.define('fog_controllers', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    field: 'ID'
  },
  uuid: {
    type: Sequelize.TEXT,
    field: 'UUID'
  },
  controllerAddress: {
    type: Sequelize.TEXT,
    field: 'controller_address'
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

export default FogControllers;