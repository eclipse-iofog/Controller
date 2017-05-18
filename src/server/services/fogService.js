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
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create iofog instance', callback));
}

const createFogInstanceWithUUID = function(props, params, callback) {

  FogManager
    .createFog(props.fogObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create fog instance.', callback));
}

const deleteFogInstance = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FogManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete iofog instance', callback));
}

const getFogInstance = function(props, params, callback) {
  var fogId = AppUtils.getProperty(params, props.fogId);

  FogManager
    .findByInstanceId(fogId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find iofog instance', callback));
}

const getFogInstanceOptional = function(props, params, callback) {
  var fogId = AppUtils.getProperty(params, props.fogId);

  FogManager
    .findByInstanceId(fogId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const findFogInstance = function(props, params, callback) {
  var fogsData= AppUtils.getProperty(params, props.fogsData);

  FogManager
    .findByInstanceId(_.pluck(fogsData, props.field))
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const getFogInstanceForUser = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  FogManager
    .findByUserId(userId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find iofog instance', callback));
}

const getFogList = function(props, params, callback) {

  FogManager
    .getFogList()
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot get iofog list', callback));
}

const getFogInstanceDetails = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FogManager
    .getFogInstanceDetails(instanceId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const updateFogInstance = function(props, params, callback){
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FogManager
    .updateFogConfig(instanceId, props.updatedFog)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update iofog instance', callback));
}

export default {
  createFogInstance: createFogInstance,
  createFogInstanceWithUUID: createFogInstanceWithUUID,
  deleteFogInstance: deleteFogInstance,
  getFogInstance: getFogInstance,
  getFogInstanceOptional: getFogInstanceOptional,
  getFogInstanceForUser: getFogInstanceForUser,
  getFogInstanceDetails: getFogInstanceDetails,
  getFogList: getFogList,
  updateFogInstance: updateFogInstance,
  findFogInstance: findFogInstance
};