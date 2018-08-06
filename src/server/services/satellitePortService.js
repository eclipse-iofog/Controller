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

const SatellitePortManager = require('../managers/satellitePortManager');
const AppUtils = require('../utils/appUtils');
const _ = require('underscore');

const createSatellitePort = function(props, params, callback) {
  SatellitePortManager
    .create(props.satellitePortObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create satellite port', callback));
}

const deletePortsForNetworkElements = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  SatellitePortManager
    .deletePortsForNetworkElements(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Satellite Port found', callback));
}

const deleteSatellitePort = function(props, params, callback) {
  let satellitePortId = AppUtils.getProperty(params, props.satellitePortId);
  
  SatellitePortManager
    .deleteById(satellitePortId)
    .then(AppUtils.onDelete.bind(null, params, 'No Satellite Port found', callback));
}

const deleteSatellitePortByIds = function(props, params, callback) {
  let satellitePortIds = AppUtils.getProperty(params, props.satellitePortIds);

  SatellitePortManager
    .deleteByPortId(_.pluck(satellitePortIds, props.field))
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const findBySatellitePortIds = function(props, params, callback) {
  let networkData = AppUtils.getProperty(params, props.networkData);

  SatellitePortManager
    .findBySatellitePortIds(_.pluck(networkData, props.field))
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const getPasscodeForNetworkElements = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  SatellitePortManager
    .getPortPasscodeForNetworkElements(elementId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find satellite port pass code', callback));
}

const getSatellitePort = function(props, params, callback) {
  let satellitePortId = AppUtils.getProperty(params, props.satellitePortId);

  SatellitePortManager
    .findById(satellitePortId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Satellite Port for Network Pairing Instance', callback));
}

module.exports =  {
  createSatellitePort: createSatellitePort,
  deletePortsForNetworkElements: deletePortsForNetworkElements,
  deleteSatellitePort: deleteSatellitePort,
  deleteSatellitePortByIds: deleteSatellitePortByIds,
  findBySatellitePortIds: findBySatellitePortIds,
  getPasscodeForNetworkElements: getPasscodeForNetworkElements,
  getSatellitePort: getSatellitePort
};