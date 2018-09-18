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

const FogManager = require('../managers/fogManager');
const AppUtils = require('../utils/appUtils');
const _ = require('underscore');

const createFogInstance = function(props, params, callback) {
  let fogType = AppUtils.getProperty(params, props.fogType),
      instanceId = AppUtils.generateRandomString(32),
      name = AppUtils.getProperty(params, props.name),
      location = AppUtils.getProperty(params, props.location),
      latitude = AppUtils.getProperty(params, props.latitude),
      longitude = AppUtils.getProperty(params, props.longitude),
      description = AppUtils.getProperty(params, props.description);

  let config = {
    uuid: instanceId,
    name: name,
    location: location,
    latitude: latitude,
    longitude: longitude,
    description: description,
    typeKey: fogType
  };

  FogManager
    .createFog(config)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create iofog instance', callback));
};

const createFogInstanceWithUUID = function(props, params, callback) {
  let fogType = AppUtils.getProperty(params, props.fogType),
    instanceId = AppUtils.getProperty(params, props.uuid),
    name = AppUtils.getProperty(params, props.name),
    description = AppUtils.getProperty(params, props.description);

  let config = {
    uuid: instanceId,
    name: name,
    typeKey: fogType,
    description: description
  };

  FogManager
    .createFog(config)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create fog instance.', callback));
};

const deleteFogInstance = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  FogManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete iofog instance', callback));
};

const getFogInstance = function(props, params, callback) {
  let fogId = AppUtils.getProperty(params, props.fogId);
  FogManager
    .findByInstanceId(fogId)
    .then(function (obj) {
        if (fogId === 'NONE') {
            callback(null, params);
        } else {
            AppUtils.onFind(params, props.setProperty, 'Cannot find iofog instance', callback, obj)
        }
    });
};

const getFogInstanceOptional = function(props, params, callback) {
  let fogId = AppUtils.getProperty(params, props.fogId);

  FogManager
    .findByInstanceId(fogId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
};

const findFogInstance = function(props, params, callback) {
  let fogsData= AppUtils.getProperty(params, props.fogsData);

  FogManager
    .findByInstanceId(_.pluck(fogsData, props.field))
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
};

const getFogInstanceForUser = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId);

  FogManager
    .findByUserId(userId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find iofog instance', callback));
};

const getFogList = function(props, params, callback) {

  FogManager
    .getFogList()
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot get iofog list', callback));
};

const getFogInstanceDetails = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  FogManager
    .getFogInstanceDetails(instanceId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
};

const updateFogInstance = function(props, params, callback){
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  FogManager
    .updateFogConfig(instanceId, props.updatedFog)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update iofog instance', callback));
};

const getFogInstanceByNameForUser = function (props, params, callback) {

  let userId = AppUtils.getProperty(params, props.userId),
    fogName = AppUtils.getProperty(params, props.fogName);

  let queryProps = {
    userId: userId,
    fogName: fogName
  };

  FogManager
    .getFogInstanceByNameForUser(queryProps)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot get iofog', callback));
};

module.exports =  {
  createFogInstance: createFogInstance,
  createFogInstanceWithUUID: createFogInstanceWithUUID,
  deleteFogInstance: deleteFogInstance,
  getFogInstance: getFogInstance,
  getFogInstanceOptional: getFogInstanceOptional,
  getFogInstanceForUser: getFogInstanceForUser,
  getFogInstanceDetails: getFogInstanceDetails,
  getFogList: getFogList,
  updateFogInstance: updateFogInstance,
  findFogInstance: findFogInstance,
  getFogInstanceByNameForUser: getFogInstanceByNameForUser
};