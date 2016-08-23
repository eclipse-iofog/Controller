/**
* @file instanceTrack.js
* @author Zishan Iqbal
* @description This file includes a instance_track model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import ElementInstance from './elementInstance';

const InstanceTrack = sequelize.define('instance_track', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  name: {type: Sequelize.TEXT, field: 'name'},
  description: {type: Sequelize.TEXT, field: 'description'},
  lastUpdated: {type: Sequelize.DATE, field: 'last_updated'},
  isSelected: {type: Sequelize.BOOLEAN, field: 'is_selected'},
  isActivated: {type: Sequelize.BOOLEAN, field: 'is_activated'},
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

InstanceTrack.belongsTo(ElementInstance);

//Fabric.hasOne(FabricProvisionKey, {as: 'provisionKeys'});
// FabricProvisionKey.belongsTo(Fabric);

export default InstanceTrack;
