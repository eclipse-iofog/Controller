/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

/**
* @file fogSystemAccessToken.js
* @author Zishan Iqbal
* @description This file includes a system_access_tokens model used by sequalize for ORM;
*/

const Sequelize = require('sequelize');
const sequelize = require('./../utils/sequelize');

const FogSystemAccessToken = sequelize.define('system_access_tokens', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  userId: {type: Sequelize.INTEGER, field: 'User_ID'},
  expirationTime: {type: Sequelize.DATE, field: 'Expiration_Time'},
  token: {type: Sequelize.TEXT, field: 'Token'}
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});


module.exports =  FogSystemAccessToken;