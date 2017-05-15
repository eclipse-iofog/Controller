/**
 * @file fog.js
 * @author Zishan Iqbal
 * @description This file includes a iofogs model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const GeneratedIds = sequelize.define('generated_ids', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    field: 'ID'
  },
  bbid: {
    type: Sequelize.TEXT,
    field: 'BBID'
  },
  controllerId: {
    type: Sequelize.TEXT,
    field: 'controller_id'
  },
  accessToken: {
    type: Sequelize.TEXT,
    field: 'access_token'
  },
  firstName: {
    type: Sequelize.TEXT,
    field: 'first_name'
  },
  lastName: {
    type: Sequelize.TEXT,
    field: 'last_name'
  },
  email: {
    type: Sequelize.TEXT,
    field: 'email'
  },
  activated: {
    type: Sequelize.INTEGER,
    field: 'activated'
  },
  iofog_uuid:{
    type: Sequelize.TEXT,
    field: 'iofog_uuid'
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

export default GeneratedIds;