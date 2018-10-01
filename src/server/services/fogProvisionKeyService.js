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

const FogProvisionKeyManager = require('../managers/fogProvisionKeyManager');
const AppUtils = require('../utils/appUtils');
const Constants = require('../constants.js');

const checkProvisionKeyExpiry = function(props, params, callback) {
  let currentTime = new Date(),
      expirationTime = AppUtils.getProperty(params, props.expirationTime);

  if(currentTime < expirationTime) {
    callback(null, params);
  }
  else {
    callback('error', Constants.MSG.ERROR_PROVISION_KEY_EXPIRED);
  }
}

const createProvisonKeyByInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId),
  	  newProvision = {
    	 iofog_uuid: instanceId,
    	 provisionKey: AppUtils.generateRandomString(8),
    	 expirationTime: new Date().getTime() + (20 * 60 * 1000)
  		};

  FogProvisionKeyManager
    .createProvisionKey(newProvision)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Provision Key', callback));
}

const deleteProvisonKeyByInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  FogProvisionKeyManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteByProvisionKey= function(props, params, callback) {
  let provisionKey = AppUtils.getProperty(params, props.provisionKey);

  FogProvisionKeyManager
    .deleteByProvisionKey(provisionKey)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const getFogByProvisionKey = function(props, params, callback) {
  let provisionKey = AppUtils.getProperty(params, props.provisionKey);

  FogProvisionKeyManager
    .getByProvisionKey(provisionKey)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, Constants.MSG.ERROR_INVALID_PROVISTION_KEY, callback));
}

const getProvisionKeyByInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  FogProvisionKeyManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Unable to find provision key with this fog', callback));
}

const deleteExpiredProvisionKeys = function (params, callback){
  //Attempt to delete all of the expired keys.
  let pastTime = new Date().getTime() - (20 * 60);

  FogProvisionKeyManager
    .deleteExpiredProvisionKeys(pastTime)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));

}

module.exports =  {
  checkProvisionKeyExpiry: checkProvisionKeyExpiry,
  createProvisonKeyByInstanceId: createProvisonKeyByInstanceId,
  deleteByProvisionKey: deleteByProvisionKey,
  deleteExpiredProvisionKeys: deleteExpiredProvisionKeys,
  deleteProvisonKeyByInstanceId: deleteProvisonKeyByInstanceId,
  getFogByProvisionKey: getFogByProvisionKey,
  getProvisionKeyByInstanceId: getProvisionKeyByInstanceId

}