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
 * @file networkPairing.js
 * @author Zishan Iqbal
 * @description This file includes a networkPairing model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Fog from './fog';
import ElementInstance from './elementInstance';
import ElementInstancePort from './elementInstancePort';
import SatellitePort from './satellitePort';

const NetworkPairing = sequelize.define('network_pairing', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  isPublicPort: {
    type: Sequelize.BOOLEAN,
    field: 'IsPublicPort'
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

NetworkPairing.belongsTo(Fog, {
  foreignKey: 'instanceId1',
  as: 'InstanceId1'
});
NetworkPairing.belongsTo(Fog, {
  foreignKey: 'instanceId2',
  as: 'InstanceId2'
});
NetworkPairing.belongsTo(ElementInstance, {
  foreignKey: 'elementId1',
  as: 'ElementId1',
  targetKey: 'uuid'
});
NetworkPairing.belongsTo(ElementInstance, {
  foreignKey: 'elementId2',
  as: 'ElementId2',
  targetKey: 'uuid'
});
NetworkPairing.belongsTo(ElementInstance, {
  foreignKey: 'networkElementId1',
  as: 'NetworkElementId1',
  targetKey: 'uuid'
});
NetworkPairing.belongsTo(ElementInstance, {
  foreignKey: 'networkElementId2',
  as: 'NetworkElementId2',
  targetKey: 'uuid'
});
NetworkPairing.belongsTo(ElementInstancePort, {
  foreignKey: 'elemen1PortId',
  as: 'Element1PortId'
});
NetworkPairing.belongsTo(SatellitePort, {
  foreignKey: 'satellitePortId',
  as: 'SatellitePortId'
});

export default NetworkPairing;