import FabricManager from '../managers/fabricManager';
import AppUtils from '../utils/appUtils';


const getFogInstance = function(params, callback) {
  FabricManager
    .findByInstanceId(params.bodyParams.instanceId)
    .then(AppUtils.onFind.bind(null, params, 'fabricInstance', 'Cannot find Fog Instance', callback));
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

export default {
  getFogInstance: getFogInstance,
  createFabricInstance: createFabricInstance,
};