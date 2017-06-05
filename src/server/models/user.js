/**
* @file user.js
* @author Zishan Iqbal
* @description This file includes a users model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const User = sequelize.define('users', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  firstName: {type: Sequelize.STRING(100), field: 'first_name'},
  lastName: {type: Sequelize.STRING(100), field: 'last_name'},
  email: Sequelize.STRING(100),
  password: Sequelize.STRING(100),
  emailActivated: {type:Sequelize.INTEGER, field: 'email_activated'},
  userAccessToken: {type: Sequelize.TEXT, field: 'user_access_token'},
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});


export default User;
