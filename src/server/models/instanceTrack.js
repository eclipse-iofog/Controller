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
* @file instanceTrack.js
* @author Zishan Iqbal
* @description This file includes a instance_track model used by sequalize for ORM;
*/

const Sequelize = require('sequelize');
const sequelize = require('./../utils/sequelize');
const ElementInstance = require('./elementInstance');

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

module.exports =  InstanceTrack;
