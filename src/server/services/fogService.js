import FogManager from '../managers/fogManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const createFogInstance = function(props, params, callback) {
  var fogType = AppUtils.getProperty(params, props.fogType),
      instanceId = AppUtils.generateRandomString(32),
      name = AppUtils.getProperty(params, props.name),
      location = AppUtils.getProperty(params, props.location),
      latitude = AppUtils.getProperty(params, props.latitude),
      longitude = AppUtils.getProperty(params, props.longitude),
      description = AppUtils.getProperty(params, props.description);

  var config = {
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
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Fog Instance', callback));
}

const deleteFogInstance = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FogManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete Fog Instance', callback));
}

const getFogInstance = function(props, params, callback) {
  var fogId = AppUtils.getProperty(params, props.fogId);

  FogManager
    .findByInstanceId(fogId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog Instance', callback));
}

const findFogInstance = function(props, params, callback) {
  var fogData= AppUtils.getProperty(params, props.fogData);

  FogManager
    .findByInstanceId(_.pluck(fogData, props.field))
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const getFogInstanceForUser = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  FogManager
    .findByUserId(userId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog Instance', callback));
}

const getFogList = function(props, params, callback) {

  FogManager
    .getFogList()
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot get Fog List', callback));
}

const updateFogInstance = function(props, params, callback){
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FogManager
    .updateFogConfig(instanceId, props.updatedFog)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Fog Instance', callback));
}

export default {
  createFogInstance: createFogInstance,
  deleteFogInstance: deleteFogInstance,
  getFogInstance: getFogInstance,
  getFogInstanceForUser: getFogInstanceForUser,
  getFogList: getFogList,
  updateFogInstance: updateFogInstance,
  findFogInstance: findFogInstance
};