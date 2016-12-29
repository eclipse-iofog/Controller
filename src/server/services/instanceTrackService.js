import InstanceTrackManager from '../managers/instanceTrackManager';
import AppUtils from '../utils/appUtils';


const getInstanceTrackByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  InstanceTrackManager
    .findInstanceContainer(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Instance Track', callback));
}

export default {
  getInstanceTrackByInstanceId: getInstanceTrackByInstanceId
};