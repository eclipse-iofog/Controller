import FogProvisionKeyManager from '../managers/fogProvisionKeyManager';
import AppUtils from '../utils/appUtils';
import Constants from '../constants.js';

const checkProvisionKeyExpiry = function(props, params, callback) {
  var currentTime = new Date(),
      expirationTime = AppUtils.getProperty(params, props.expirationTime);

  if(currentTime < expirationTime) {
    callback(null, params);
  }
  else {
    callback('error', Constants.MSG.ERROR_PROVISION_KEY_EXPIRED);
  }
}

const createProvisonKeyByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId),
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
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FogProvisionKeyManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteByProvisionKey= function(props, params, callback) {
  var provisionKey = AppUtils.getProperty(params, props.provisionKey);

  FogProvisionKeyManager
    .deleteByProvisionKey(provisionKey)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const getFogByProvisionKey = function(props, params, callback) {
  var provisionKey = AppUtils.getProperty(params, props.provisionKey);

  FogProvisionKeyManager
    .getByProvisionKey(provisionKey)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, Constants.MSG.ERROR_INVALID_PROVISTION_KEY, callback));
}

const getProvisionKeyByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FogProvisionKeyManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Unable to find provision key with this fog', callback));
}

const deleteExpiredProvisionKeys = function (params, callback){
  //Attempt to delete all of the expired keys.
  var pastTime = new Date().getTime() - (20 * 60);  

  FogProvisionKeyManager
    .deleteExpiredProvisionKeys(pastTime)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));

}

export default {
  checkProvisionKeyExpiry: checkProvisionKeyExpiry,
  createProvisonKeyByInstanceId: createProvisonKeyByInstanceId,
  deleteByProvisionKey: deleteByProvisionKey,
  deleteExpiredProvisionKeys: deleteExpiredProvisionKeys,
  deleteProvisonKeyByInstanceId: deleteProvisonKeyByInstanceId,
  getFogByProvisionKey: getFogByProvisionKey,
  getProvisionKeyByInstanceId: getProvisionKeyByInstanceId

}