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

const getFogUser = function(props, params, callback) {
  var fogUserId = AppUtils.getProperty(params, props.instanceId);

  FabricUserManager
    .findByInstanceId(fogUserId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog User', callback));
}

const deleteFogUserByInstanceIdAndUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId),
	    instanceId = AppUtils.getProperty(params, props.instanceId);

  FabricUserManager
    .deleteByInstanceIdAndUserId(userId, instanceId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete Fog User', callback));
}

export default {
  createFabricUser: createFabricUser,
  getFogUser:  getFogUser,
  deleteFogUserByInstanceIdAndUserId: deleteFogUserByInstanceIdAndUserId
};