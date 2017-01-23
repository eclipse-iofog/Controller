/**
* @file fogProvisionKey.js
* @author Zishan Iqbal
* @description This file includes a iofog_provision_keys model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const FogProvisionKey = sequelize.define('iofog_provision_keys', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  provisionKey: {type: Sequelize.STRING(100), field: 'provisioning_string'},
  expirationTime: {type: Sequelize.DATE, field: 'expiration_time'}
  // instanceId: {type: Sequelize.TEXT, field: 'instanceID'}
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

export default FogProvisionKey;
