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
 * @file catalogItem.js
 * @author Zishan Iqbal
 * @description This file includes a catalog_item_input_type model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const CatalogItem = require('./catalogItem');

const CatalogItemInputType = sequelize.define('catalog_item_input_type', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id'
  },
  infoType: {
    type: Sequelize.TEXT,
    field: 'info_type'
  },
  infoFormat: {
    type: Sequelize.TEXT,
    field: 'info_format'
  },

}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

CatalogItemInputType.belongsTo(CatalogItem, {
    foreignKey: 'catalog_item_id',
    as: 'catalogItemId'
});

module.exports =  CatalogItemInputType;