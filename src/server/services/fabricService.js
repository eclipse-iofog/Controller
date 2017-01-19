import FabricManager from '../managers/fabricManager';
import AppUtils from '../utils/appUtils';

const createFogInstance = function(props, params, callback) {
  var fogType = AppUtils.getProperty(params, props.fogType),
      instanceId = AppUtils.generateRandomString(32);

  var config = {
    uuid: instanceId,
    typeKey: fogType
  };

  FabricManager
    .createFog(config)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Fog Instance', callback));
}

const deleteFogInstance = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FabricManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete Fog Instance', callback));
}

const getFogInstance = function(props, params, callback) {
  var fogId = AppUtils.getProperty(params, props.fogId);

  FabricManager
    .findByInstanceId(fogId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog Instance', callback));
}
const getFogInstanceForUser = function(props, params, callback) {

  var userId = AppUtils.getProperty(params, props.userId);

  FabricManager
    .findByUserId(userId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog Instance', callback));
}

const getFogList = function(props, params, callback) {

  FabricManager
    .getFogList()
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot get Fog List', callback));
}

const updateFogInstance = function(props, params, callback){
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FabricManager
    .updateFogConfig(instanceId, props.updatedFog)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Fog Instance', callback));
}

export default {
  createFogInstance: createFogInstance,
  deleteFogInstance: deleteFogInstance,
  getFogInstance: getFogInstance,
  getFogInstanceForUser: getFogInstanceForUser,
  getFogList: getFogList,
  updateFogInstance: updateFogInstance
};