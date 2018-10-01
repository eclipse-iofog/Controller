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
 * @file dataTracks.js
 * @author Zishan Iqbal
 * @description This file includes a data_tracks model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('./../utils/sequelize');
const User = require('./user');

const DataTracks = sequelize.define('data_tracks', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  name: {
    type: Sequelize.TEXT,
    field: 'name'
  },
  instanceId: {
    type: Sequelize.TEXT,
    field: 'instance_id'
  },
  updatedBy: {
    type: Sequelize.BIGINT,
    field: 'updated_by'
  },
  description: {
    type: Sequelize.TEXT,
    field: 'description'
  },
  isSelected: {
    type: Sequelize.INTEGER,
    field: 'is_selected'
  },
  isActivated: {
    type: Sequelize.INTEGER,
    field: 'is_activated'
  }
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: true,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

DataTracks.belongsTo(User);

module.exports =  DataTracks;
