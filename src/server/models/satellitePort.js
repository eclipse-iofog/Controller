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
 * @file satellitePort.js
 * @author Zishan Iqbal
 * @description
 */

const Sequelize = require('sequelize');
const sequelize = require('./../utils/sequelize');
const Satellite = require('./satellite');

const SatellitePort = sequelize.define('satellite_port', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  port1: {
    type: Sequelize.BIGINT,
    field: 'port1'
  },
  port2: {
    type: Sequelize.BIGINT,
    field: 'port2'
  },
  maxConnectionsPort1: {
    type: Sequelize.BIGINT,
    field: 'max_connections_port1'
  },
  maxConnectionsPort2: {
    type: Sequelize.BIGINT,
    field: 'max_connection_port2'
  },
  passcodePort1: {
    type: Sequelize.TEXT,
    field: 'passcode_port1'
  },
  passcodePort2: {
    type: Sequelize.TEXT,
    field: 'passcode_port2'
  },
  heartBeatAbsenceThresholdPort1: {
    type: Sequelize.BIGINT,
    field: 'heartbeat_absence_threshold_port1'
  },
  heartBeatAbsenceThresholdPort2: {
    type: Sequelize.BIGINT,
    field: 'heartbeat_absence_threshold_port2'
  },
  mappingId: {
    type: Sequelize.TEXT,
    field: 'mapping_id'
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

SatellitePort.belongsTo(Satellite);

module.exports =  SatellitePort;