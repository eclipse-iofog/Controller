import StreamViewerManager from '../managers/streamViewerManager';
import AppUtils from '../utils/appUtils';

const createStreamViewer = function(props, params, callback) {

  StreamViewerManager
    .create(props.streamViewerObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Stream Viewer object', callback));
}

const getStreamViewerByFogInstanceId = function(props, params, callback) {
   var instanceId = AppUtils.getProperty(params, props.instanceId);

  StreamViewerManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const deleteStreamViewerByFogInstanceId  = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);
  
  StreamViewerManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

export default {
  createStreamViewer: createStreamViewer,
  getStreamViewerByFogInstanceId: getStreamViewerByFogInstanceId,
  deleteStreamViewerByFogInstanceId: deleteStreamViewerByFogInstanceId

};