/**
* @file dataTracks.js
* @author Zishan Iqbal
* @description This file includes a data_tracks model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const DataTracks = sequelize.define('data_tracks', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  name: {type: Sequelize.TEXT, field: 'name'},
  instanceId: {type: Sequelize.TEXT, field: 'instance_id'},
  lastUpdated: {type: Sequelize.DATE, field: 'last_updated'},
  updatedBy: {type: Sequelize.BIGINT, field: 'updated_by'},
  description: {type: Sequelize.TEXT, field: 'description'},
  isSelected: {type: Sequelize.BOOLEAN, field: 'is_selected'},
  isActivated: {type: Sequelize.BOOLEAN, field: 'is_activated'}
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: true,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

export default DataTracks;