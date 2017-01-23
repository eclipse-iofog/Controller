/**
* @file fogUser.js
* @author Zishan Iqbal
* @description This file includes a iofog_users model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import User from './user';
import Fog from './fog';

const FogUser = sequelize.define('iofog_users', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'}
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

User.belongsToMany(Fog, {through: FogUser, as: 'userId', foreignKey: 'user_id'});
Fog.belongsToMany(User, {through: FogUser, as: 'fogId', foreignKey: 'fog_id' });

export default FogUser;

