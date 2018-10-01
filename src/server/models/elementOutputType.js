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
 * @file element.js
 * @author Zishan Iqbal
 * @description This file includes a element_output_type model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('./../utils/sequelize');
const Element = require('./element');

const ElementOutputType = sequelize.define('element_output_type', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  elementKey: {
    type: Sequelize.BIGINT,
    field: 'element_key'
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

ElementOutputType.belongsTo(Element);

module.exports =  ElementOutputType;