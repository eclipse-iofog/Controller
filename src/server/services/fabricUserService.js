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

export default {
  createFabricUser: createFabricUser

};