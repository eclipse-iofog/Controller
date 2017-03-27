import FogUserManager from '../managers/fogUserManager';
import AppUtils from '../utils/appUtils';

const createFogUser = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId),
      instanceId = AppUtils.getProperty(params, props.instanceId);

  FogUserManager
    .create(userId, instanceId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create user for Fog Instance', callback));
}

const deleteFogUserByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FogUserManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteFogUserByInstanceIdAndUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId),
      instanceId = AppUtils.getProperty(params, props.instanceId);

  FogUserManager
    .deleteByInstanceIdAndUserId(userId, instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const findFogUserByInstanceIdAndUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId),
      instanceId = AppUtils.getProperty(params, props.instanceId);

  FogUserManager
    .isUserExist(userId, instanceId)
    .then(AppUtils.onFind.bind(null, params,props.setProperty, 'Unable to find Fog User', callback));
}

const getFogUserByInstanceId = function(props, params, callback) {
  var fogId = AppUtils.getProperty(params, props.instanceId);

  FogUserManager
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