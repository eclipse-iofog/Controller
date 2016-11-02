import ElementInstancePortManager from '../managers/elementInstancePortManager';
import AppUtils from '../utils/appUtils';

const createStreamViewerPort = function(params, callback) {
  ElementInstancePortManager
    .createElementPort(params.userId, params.streamViewer.uuid, 60400)
    .then(AppUtils.onCreate.bind(null, params, 'streamViewerPort', 'Unable to create Stream Viewer Port', callback));

}

const createDebugConsolePort = function(params, callback) {
  ElementInstancePortManager
    .createElementPort(params.userId, params.debugConsole.uuid, 60401)
    .then(AppUtils.onCreate.bind(null, params, null, 'Unable to create Debug Console Port', callback));

}

const deleteElementInstancePort = function(params, callback) {
  ElementInstancePortManager
    .deleteByElementInstanceId(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Element Instance Port found', callback));
}

export default {
  createStreamViewerPort: createStreamViewerPort,
  createDebugConsolePort: createDebugConsolePort,
  deleteElementInstancePort: deleteElementInstancePort,

};