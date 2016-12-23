import FabricManager from '../managers/fabricManager';
import AppUtils from '../utils/appUtils';


const getFogInstance = function(props, params, callback) {
  var fabricId = AppUtils.getProperty(params, props.fogId);

  FabricManager
    .findByInstanceId(fabricId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog Instance', callback));
}

/**
 * @desc - this function finds the element instance which was changed
 */
const createFogInstance = function(props, params, callback) {
  var fogType = AppUtils.getProperty(params, props.fabricType),
      instanceId = AppUtils.generateRandomString(32);

  var config = {
    uuid: instanceId,
    typeKey: fogType
  };

  // This function creates a new fabric and inserts its data
  // in to the database, along with the default values
  FabricManager
    .createFabric(config)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Fabric Instance', callback));
}

  const getFogList = function(props, params, callback) {

  FabricManager
    .getFogList()
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot get Fog List', callback));
}

const getFogInstanceForUser = function(props, params, callback) {

  var userId = AppUtils.getProperty(params, props.userId);

  FabricManager
    .findByUserId(userId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog Instance', callback));
}

const updateFogInstance = function(params, callback) {
  var updateChange = {};

  if (params.bodyParams.name) {
    updateChange.name = params.bodyParams.name;
  }

  if (params.bodyParams.location) {
    updateChange.location = params.bodyParams.location
  }

  if (params.bodyParams.latitude) {
    updateChange.latitude = params.bodyParams.latitude
  }

  if (params.bodyParams.longitude) {
    updateChange.longitude = params.bodyParams.longitude
  }

  if (params.bodyParams.description) {
    updateChange.description = params.bodyParams.description
  }

  FabricManager
    .updateFabricConfig(params.bodyParams.instanceId, updateChange)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Fog Instance', callback));

}

const deleteFogInstance = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FabricManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete Fabric', callback));
}

export default {
  getFogInstance: getFogInstance,
  createFogInstance: createFogInstance,
  updateFogInstance: updateFogInstance,
  getFogInstanceForUser: getFogInstanceForUser,
  deleteFogInstance: deleteFogInstance,
  getFogList: getFogList
};