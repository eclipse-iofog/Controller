/**
* @file fabricUser.js
* @author Zishan Iqbal
* @description This file includes a iofabric_users model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import User from './user';
import Fabric from './fabric';

const FabricUser = sequelize.define('iofabric_users', {
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

User.belongsToMany(Fabric, {through: FabricUser, as: 'userId', foreignKey: 'user_id'});
Fabric.belongsToMany(User, {through: FabricUser, as: 'fabricId', foreignKey: 'fabric_id' });

export default FabricUser;

