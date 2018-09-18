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
* @file fogAccessToken.js
* @author Zishan Iqbal
* @description This file includes a iofog_access_tokens model used by sequalize for ORM;
*/

const Sequelize = require('sequelize');
const sequelize = require('./../utils/sequelize');
const Fog = require('./fog');

const FogAccessToken = sequelize.define('iofog_access_tokens', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  userId: {type: Sequelize.INTEGER, field: 'user_id'},
  expirationTime: {type: Sequelize.BIGINT, field: 'expiration_time'},
  token: {type: Sequelize.TEXT, field: 'token'}
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

FogAccessToken.belongsTo(Fog, {
  foreignKey: 'iofog_uuid'
});

module.exports =  FogAccessToken;