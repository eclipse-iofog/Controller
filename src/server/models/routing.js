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
 * @file routing.js
 * @author Zishan Iqbal
 * @description This file includes a routing model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Fog from './fog';
import ElementInstance from './elementInstance';

const Routing = sequelize.define('routing', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  isNetworkConnection: {
    type: Sequelize.BOOLEAN,
    field: 'is_network_connection'
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

Routing.belongsTo(Fog, {
  foreignKey: 'publishing_instance_id',
  as: 'publishingInstanceId'
});

Routing.belongsTo(Fog, {
  foreignKey: 'destination_instance_id',
  as: 'destinationInstanceId'
});

Routing.belongsTo(ElementInstance, {
  foreignKey: 'publishing_element_id',
  as: 'publishingElementId',
  targetKey: 'uuid'
});

Routing.belongsTo(ElementInstance, {
  foreignKey: 'destination_element_id',
  as: 'destinationElementId',
  targetKey: 'uuid'
});

export default Routing;