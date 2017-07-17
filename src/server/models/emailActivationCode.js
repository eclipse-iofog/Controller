/**
* @file emailActivationCodes.js
* @author Zishan Iqbal
* @description This file includes a email_activation_codes model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import User from './user';

const EmailActivationCode = sequelize.define('email_activation_code', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  activationCode: {type: Sequelize.TEXT, field: 'activation_code'},
  expirationTime: {type: Sequelize.BIGINT, field: 'expiration_time'},
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

User.hasMany(EmailActivationCode, { foreignKey: 'user_id' })

export default EmailActivationCode;
