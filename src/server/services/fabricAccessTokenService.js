import FabricAccessTokenManager from '../managers/fabricAccessTokenManager';
import AppUtils from '../utils/appUtils';


const deleteFabricAccessTokenByUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  FabricAccessTokenManager
    .deleteByUserId(userId)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Fog Access Token', callback));
}

export default {
  deleteFabricAccessTokenByUserId: deleteFabricAccessTokenByUserId
};