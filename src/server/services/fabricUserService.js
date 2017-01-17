import FabricUserManager from '../managers/fabricUserManager';
import AppUtils from '../utils/appUtils';

const createFogUser = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId),
      instanceId = AppUtils.getProperty(params, props.instanceId);

  FabricUserManager
    .create(userId, params.fabricInstance.uuid)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create user for Fabric Instance', callback));
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

const findFogUserByInstanceIdAndUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId),
      instanceId = AppUtils.getProperty(params, props.instanceId);

  FabricUserManager
    .isUserExist(userId, instanceId)
    .then(AppUtils.onFind.bind(null, params,props.setProperty, 'Unable to find Fog User', callback));
}

const getFogUserByInstanceId = function(props, params, callback) {
  var fogId = AppUtils.getProperty(params, props.instanceId);

  FabricUserManager
    .findByInstanceId(fogId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog User', callback));
}

export default {
  createFogUser: createFogUser,
  deleteFogUserByInstanceId: deleteFogUserByInstanceId,
  deleteFogUserByInstanceIdAndUserId: deleteFogUserByInstanceIdAndUserId,
  findFogUserByInstanceIdAndUserId: findFogUserByInstanceIdAndUserId,
  getFogUserByInstanceId: getFogUserByInstanceId
};