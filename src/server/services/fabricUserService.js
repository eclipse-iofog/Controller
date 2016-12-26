import FabricUserManager from '../managers/fabricUserManager';
import AppUtils from '../utils/appUtils';

/**
 * @desc - this function finds the element instance which was changed
 */
const createFabricUser = function(params, callback) {
  FabricUserManager
    .create(params.userId, params.fabricInstance.uuid)
    .then(AppUtils.onCreate.bind(null, params, null, 'Unable to create user for Fabric Instance', callback));
}

const getFogUserByInstanceId = function(props, params, callback) {
  var fogId = AppUtils.getProperty(params, props.instanceId);

  FabricUserManager
    .findByInstanceId(fogId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog User', callback));
}

const deleteFogUserByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FabricUserManager
    .deleteByInstanceIdAndUserId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Fog User', callback));
}


const deleteFogUserByInstanceIdAndUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId),
	    instanceId = AppUtils.getProperty(params, props.instanceId);

  FabricUserManager
    .deleteByInstanceIdAndUserId(userId, instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Fog User', callback));
}

export default {
  createFabricUser: createFabricUser,
  getFogUserByInstanceId:  getFogUserByInstanceId,
  deleteFogUserByInstanceId: deleteFogUserByInstanceId,
  deleteFogUserByInstanceIdAndUserId: deleteFogUserByInstanceIdAndUserId
};