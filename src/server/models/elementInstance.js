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
 * @file elementInstance.js
 * @author Zishan Iqbal
 * @description This file includes a element_instance model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('./../utils/sequelize');
const Fog = require('./fog');
const Element = require('./element');

const ElementInstance = sequelize.define('element_instance', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  uuid: {
    type: Sequelize.TEXT,
    field: 'UUID'
  },
  trackId: {
    type: Sequelize.BIGINT,
    field: 'track_id'
  },
  config: {
    type: Sequelize.TEXT,
    field: 'config'
  },
  name: {
    type: Sequelize.TEXT,
    field: 'name'
  },
  updatedBy: {
    type: Sequelize.BIGINT,
    field: 'updated_by'
  },
  configLastUpdated: {
    type: Sequelize.BIGINT,
    field: 'config_last_updated'
  },
  isStreamViewer: {
    type: Sequelize.BOOLEAN,
    field: 'is_stream_viewer'
  },
  isDebugConsole: {
    type: Sequelize.BOOLEAN,
    field: 'is_debug_console'
  },
  isManager: {
    type: Sequelize.BOOLEAN,
    field: 'is_manager'
  },
  isNetwork: {
    type: Sequelize.BOOLEAN,
    field: 'is_network'
  },
  needUpdate: {
      type: Sequelize.BOOLEAN,
      field: 'need_update'
  },
  registryId: {
    type: Sequelize.BIGINT,
    field: 'registry_id'
  },
  rebuild: {
    type: Sequelize.BOOLEAN,
    field: 'rebuild'
  },
  rootHostAccess: {
    type: Sequelize.BOOLEAN,
    field: 'root_host_access'
  },
  logSize: {
    type: Sequelize.BIGINT,
    field: 'log_size'
  },
  volumeMappings: {
    type: Sequelize.TEXT,
    field: 'volume_mappings'
  },
  imageSnapshot: {
    type: Sequelize.TEXT,
    field: 'image_snapshot'
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

ElementInstance.belongsTo(Element, {
  foreignKey: 'element_id'
});
ElementInstance.belongsTo(Fog, {
  foreignKey: 'iofog_uuid'
});
module.exports =  ElementInstance;