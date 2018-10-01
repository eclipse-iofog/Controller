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
* @file fogType.js
* @author Zishan Iqbal
* @description This file includes a fog_type model used by sequalize for ORM;
*/

const Sequelize = require('sequelize');
const sequelize = require('./../utils/sequelize');

const FogType = sequelize.define('iofog_type', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  name: {type: Sequelize.TEXT, field: 'Name'},
  image: {type: Sequelize.TEXT, field: 'Image'},
  description: {type: Sequelize.TEXT, field: 'Description'},
  streamViewerElementKey: {type: Sequelize.BIGINT, field: 'StreamViewerElementKey'},
  consoleElementKey: {type: Sequelize.BIGINT, field: 'consoleElementKey'},
  networkElementKey: {type: Sequelize.BIGINT, field: 'NetworkElementKey'},
  halElementKey: {type: Sequelize.BIGINT, field: 'HalElementKey'},
  mongoElementKey: {type: Sequelize.BIGINT, field: 'MongoElementKey'},
  influxElementKey: {type: Sequelize.BIGINT, field: 'InfluxElementKey'},
  grafanaElementKey: {type: Sequelize.BIGINT, field: 'GrafanaElementKey'},
  bluetoothElementKey: {type: Sequelize.BIGINT, field: 'BluetoothElementKey'},
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

module.exports =  FogType;
