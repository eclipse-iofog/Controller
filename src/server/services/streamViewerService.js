import StreamViewerManager from '../managers/streamViewerManager';
import AppUtils from '../utils/appUtils';

const createStreamViewer = function(params, callback) {
  var baseUrl = 'https://' + params.satellite.domain + ':' + params.satellitePort.port2,
    token = JSON.parse(params.streamViewer.config).accesstoken,
    streamViewerObj = {
      version: 1,
      apiBaseUrl: baseUrl,
      accessToken: token,
      elementId: params.streamViewer.uuid,
      iofabric_uuid: params.fabricInstance.uuid
    };

  StreamViewerManager
    .create(streamViewerObj)
    .then(AppUtils.onCreate.bind(null, params, null, 'Unable to create Stream Viewer object', callback));

}

const getStreamViewerByFogInstanceId = function(params, callback) {
  StreamViewerManager
    .findByInstanceId(params.bodyParams.instanceId)
    .then(AppUtils.onFindOptional.bind(null, params, 'streamViewer', callback));
}

const deleteStreamViewerByFogInstanceId  = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);
  
  StreamViewerManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Stream Viewer object', callback));
}

export default {
  createStreamViewer: createStreamViewer,
  getStreamViewerByFogInstanceId: getStreamViewerByFogInstanceId,
  deleteStreamViewerByFogInstanceId: deleteStreamViewerByFogInstanceId

};