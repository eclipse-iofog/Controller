import FogControllerManager from '../managers/fogControllerManager';
import AppUtils from '../utils/appUtils';

const findFogControllersByUUID = function(props, params, callback) {
  var uuid = AppUtils.getProperty(params, props.uuid);

  FogControllerManager
    .getByUUID(uuid)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Registration failed: Please enter a valid token.', callback));
}
export default {
  findFogControllersByUUID: findFogControllersByUUID
}