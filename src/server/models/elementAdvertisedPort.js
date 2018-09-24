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
 * @file ElementAdvertisedPort.js
 * @author Zishan Iqbal
 * @description This file includes a element_advertised_port model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('./../utils/sequelize');
const Element = require('./element');

const ElementAdvertisedPort = sequelize.define('element_advertised_port', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  portNumber: {
    type: Sequelize.BIGINT,
    field: 'port_number'
  },
  name: {
    type: Sequelize.TEXT,
    field: 'name'
  },
  description: {
    type: Sequelize.TEXT,
    field: 'description'
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

ElementAdvertisedPort.belongsTo(Element);

module.exports =  ElementAdvertisedPort;