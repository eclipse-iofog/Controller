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
const createFabricInstance = function(params, callback) {
  var fabricType = params.bodyParams.FabricType,
    instanceId = AppUtils.generateRandomString(32);

  var config = {
    uuid: instanceId,
    typeKey: fabricType
  };

  // This function creates a new fabric and inserts its data
  // in to the database, along with the default values
  FabricManager
    .createFabric(config)
    .then(AppUtils.onCreate.bind(null, params, 'fabricInstance', 'Unable to create Fabric Instance', callback));
}

const getFogInstanceForUser = function(props, params, callback) {
    var userId = AppUtils.getProperty(params, props.userId);

  FabricManager
    .findByUserId(userId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Fog Instance', callback));
}

export default {
  getFogInstance: getFogInstance,
  createFabricInstance: createFabricInstance,
  getFogInstanceForUser: getFogInstanceForUser
};