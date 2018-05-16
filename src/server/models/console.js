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
 * @file consoles.js
 * @author Zishan Iqbal
 * @description This file includes a consoles model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Fog from './fog';
import ElementInstance from './elementInstance';

const Console = sequelize.define('consoles', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  version: {
    type: Sequelize.BIGINT,
    field: 'version'
  },
  apiBaseUrl: {
    type: Sequelize.TEXT,
    field: 'api_base_url'
  },
  accessToken: {
    type: Sequelize.TEXT,
    field: 'access_token'
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

Console.belongsTo(Fog);
Console.belongsTo(ElementInstance, {
  foreignKey: 'ElementId',
  as: 'elementId',
  targetKey: 'uuid'
});

export default Console;