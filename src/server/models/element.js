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
 * @description This file includes a element model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Registry from './registry';
import User from './user';

const Element = sequelize.define('element', {
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
  description: {
    type: Sequelize.TEXT,
    field: 'description'
  },
  category: {
    type: Sequelize.TEXT,
    field: 'category'
  },
  config: {
    type: Sequelize.TEXT,
    field: 'config'
  },
  registryId: {
      type: Sequelize.BIGINT,
      field: 'registry_id'
  },
  publisher: {
    type: Sequelize.TEXT,
    field: 'publisher'
  },
  diskRequired: {
    type: Sequelize.BIGINT,
    field: 'diskRequired'
  },
  ramRequired: {
    type: Sequelize.BIGINT,
    field: 'ram_required'
  },
  picture: {
    type: Sequelize.BIGINT,
    field: 'picture'
  },
  isPublic: {
    type: Sequelize.BOOLEAN,
    field: 'is_public'
  }
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

Element.belongsTo(Registry, {
    foreignKey: 'registry_id'
});

Element.belongsTo(User, {
    foreignKey: 'user_id'
});

export default Element;