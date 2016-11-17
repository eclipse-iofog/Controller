import ElementInstancePortManager from '../managers/elementInstancePortManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const createStreamViewerPort = function(params, callback) {
  ElementInstancePortManager
    .createElementPort(params.userId, params.streamViewer.uuid, 60400)
    .then(AppUtils.onCreate.bind(null, params, 'elementInstancePort', 'Unable to create Stream Viewer Port', callback));

}

const createDebugConsolePort = function(params, callback) {
  ElementInstancePortManager
    .createElementPort(params.userId, params.debugConsole.uuid, 60401)
    .then(AppUtils.onCreate.bind(null, params, null, 'Unable to create Debug Console Port', callback));

}

const getElementInstancePort = function(params, callback) {
  ElementInstancePortManager
    .findById(params.bodyParams.portId)
    .then(AppUtils.onFind.bind(null, params, 'elementInstancePort', 'Cannot find Element Instance Port', callback));
}

const findElementInstancePortsByElementIds = function(params, callback) {
  ElementInstancePortManager
    .findPortsByElementIds(_.pluck(params.elementInstance, 'uuid'))
    .then(AppUtils.onFind.bind(null, params, 'elementInstancePort', 'No Element Instance Port found', callback));
}

const deleteElementInstancePort = function(params, callback) {
  ElementInstancePortManager
    .deleteByElementInstanceId(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Element Instance Port found', callback));
}

export default {
  createStreamViewerPort: createStreamViewerPort,
  createDebugConsolePort: createDebugConsolePort,
  getElementInstancePort: getElementInstancePort,
  findElementInstancePortsByElementIds: findElementInstancePortsByElementIds,
  deleteElementInstancePort: deleteElementInstancePort,

};