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
 * @file elementinstancePort.js
 * @author Zishan Iqbal
 * @description This file includes a element_instance_port model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import ElementInstance from './elementInstance';

const ElementInstancePort = sequelize.define('element_instance_port', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  portinternal: {
    type: Sequelize.BIGINT,
    field: 'port_internal'
  },
  portexternal: {
    type: Sequelize.BIGINT,
    field: 'port_external'
  },
  updatedBy: {
    type: Sequelize.BIGINT,
    field: 'updated_by'
  },
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: true,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

ElementInstancePort.belongsTo(ElementInstance, {
  foreignKey: 'elementId',
  as: 'ElementId',
  targetKey: 'uuid'
});

export default ElementInstancePort;