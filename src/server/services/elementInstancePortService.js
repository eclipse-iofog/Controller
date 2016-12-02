import ElementInstancePortManager from '../managers/elementInstancePortManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const createStreamViewerPort = function(params, callback) {
  ElementInstancePortManager
    .createElementPort(params.userId, params.streamViewer.uuid, 60400, 80)
    .then(AppUtils.onCreate.bind(null, params, 'elementInstancePort', 'Unable to create Stream Viewer Port', callback));

}

const createDebugConsolePort = function(params, callback) {
  ElementInstancePortManager
    .createElementPort(params.userId, params.debugConsole.uuid, 60401, 80)
    .then(AppUtils.onCreate.bind(null, params, null, 'Unable to create Debug Console Port', callback));

}

const createElementInstancePort = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId),
    internalPort = AppUtils.getProperty(params, props.internalPort),
    externalPort = AppUtils.getProperty(params, props.externalPort),
    elementId = AppUtils.getProperty(params, props.elementId);

  ElementInstancePortManager
    .createElementPort(userId, elementId, externalPort, internalPort)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Element Instance Port', callback));
}

const getElementInstancePort = function(props, params, callback) {
  var portId = AppUtils.getProperty(params, props.portId);

  ElementInstancePortManager
    .findById(portId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance Port', callback));
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

const deleteElementInstancePortById = function(props, params, callback) {
  var elementPortId = AppUtils.getProperty(params, props.elementPortId);

  ElementInstancePortManager
    .deleteById(elementPortId)
    .then(AppUtils.onDelete.bind(null, params, 'No Element Instance Port found', callback));
}

export default {
  createElementInstancePort: createElementInstancePort,
  createStreamViewerPort: createStreamViewerPort,
  createDebugConsolePort: createDebugConsolePort,
  getElementInstancePort: getElementInstancePort,
  findElementInstancePortsByElementIds: findElementInstancePortsByElementIds,
  deleteElementInstancePort: deleteElementInstancePort,
  deleteElementInstancePortById: deleteElementInstancePortById

};