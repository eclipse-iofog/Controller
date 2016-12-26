import FabricProvisionKeyManager from '../managers/fabricProvisionKeyManager';
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
    	iofabric_uuid: instanceId,
    	provisionKey: AppUtils.generateRandomString(8),
    	expirationTime: new Date().getTime() + (20 * 60 * 1000)
  		};

  FabricProvisionKeyManager
    .createProvisionKey(newProvision)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Provision Key', callback));
}

const deleteProvisonKeyByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FabricProvisionKeyManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Provision Key', callback));
}

const deleteByProvisionKey= function(props, params, callback) {
  var provisionKey = AppUtils.getProperty(params, props.provisionKey);

  FabricProvisionKeyManager
    .deleteByProvisionKey(provisionKey)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Provision Key', callback));
}

const getFogByProvisionKey = function(props, params, callback) {
  var provisionKey = AppUtils.getProperty(params, props.provisionKey);

  FabricProvisionKeyManager
    .getByProvisionKey(provisionKey)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, Constants.MSG.ERROR_INVALID_PROVISTION_KEY, callback));
}

export default {
  checkProvisionKeyExpiry: checkProvisionKeyExpiry,
  createProvisonKeyByInstanceId: createProvisonKeyByInstanceId,
  deleteByProvisionKey: deleteByProvisionKey,
  deleteProvisonKeyByInstanceId: deleteProvisonKeyByInstanceId,
  getFogByProvisionKey: getFogByProvisionKey
}