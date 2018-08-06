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

const SatelliteManager = require('../managers/satelliteManager');
const AppUtils = require('../utils/appUtils');
const _ = require('underscore');

const findBySatelliteIds = function(props, params, callback) {
  let satellitePortData = AppUtils.getProperty(params, props.satellitePortData);

  SatelliteManager
    .findBySatelliteIds(_.pluck(satellitePortData, props.field))
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const getRandomSatellite = function(params, callback) {
  let randomNumber;

  SatelliteManager.findAll()
    .then((satellites) => {
      if (satellites && satellites.length > 0) {
        randomNumber = Math.round((Math.random() * (satellites.length - 1)));
        console.log('Random number ' + randomNumber);
        params.satellite = satellites[randomNumber];
        callback(null, params);
      } else {
        callback('error', 'No Satellite defined');
      }
    });
}

const getSatelliteById = function(props, params, callback) {
  let satelliteId = AppUtils.getProperty(params, props.satelliteId);

  SatelliteManager
    .findById(satelliteId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Satellite', callback));
}

module.exports =  {
  findBySatelliteIds: findBySatelliteIds,
  getRandomSatellite: getRandomSatellite,
  getSatelliteById: getSatelliteById
};