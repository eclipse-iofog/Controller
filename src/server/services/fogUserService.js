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

const FogUserManager = require('../managers/fogUserManager');
const AppUtils = require('../utils/appUtils');

const createFogUser = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId),
      instanceId = AppUtils.getProperty(params, props.instanceId);

  FogUserManager
    .create(userId, instanceId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create user for Fog Instance', callback));
}

const deleteFogUserByInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  FogUserManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteFogUserByInstanceIdAndUserId = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId),
      instanceId = AppUtils.getProperty(params, props.instanceId);

  FogUserManager
    .deleteByInstanceIdAndUserId(userId, instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const findFogUserByInstanceIdAndUserId = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId),
      instanceId = AppUtils.getProperty(params, props.instanceId);

  FogUserManager
    .isUserExist(userId, instanceId)
    .then(AppUtils.onFind.bind(null, params,props.setProperty, 'Unable to find Fog User', callback));
}

const getFogUserByInstanceId = function(props, params, callback) {
  let fogId = AppUtils.getProperty(params, props.instanceId);

  FogUserManager
    .findByInstanceId(fogId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog User', callback));
}

module.exports =  {
  createFogUser: createFogUser,
  deleteFogUserByInstanceId: deleteFogUserByInstanceId,
  deleteFogUserByInstanceIdAndUserId: deleteFogUserByInstanceIdAndUserId,
  findFogUserByInstanceIdAndUserId: findFogUserByInstanceIdAndUserId,
  getFogUserByInstanceId: getFogUserByInstanceId
};