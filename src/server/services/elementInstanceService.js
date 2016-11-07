import ElementInstanceManager from '../managers/elementInstanceManager';
import AppUtils from '../utils/appUtils';

const getElementInstance = function(params, callback) {
  ElementInstanceManager
    .findByUuId(params.bodyParams.elementId)
    .then(AppUtils.onFind.bind(null, params, 'elementInstance', 'Cannot find Element Instance', callback));
}

const getElementInstancesByTrackId = function(params, callback) {
  ElementInstanceManager
    .findByTrackId(params.bodyParams.trackId)
    .then(AppUtils.onFind.bind(null, params, 'trackElementInstances', 'Cannot find Element Instances related to track ' + params.bodyParams.trackId, callback));
}

/**
 * @desc - this function uses the default values to create a new element instance
 */
const createElementInstance = function(params, callback) {
  ElementInstanceManager
    .createElementInstance(params.element, params.userId, params.bodyParams.TrackId, params.bodyParams.Name, params.bodyParams.LogSize)
    .then(AppUtils.onCreate.bind(null, params, 'elementInstance', 'Unable to create Element Instance', callback));
}

/**
 * @desc - this function finds the element instance which was changed
 */
const createStreamViewerElement = function(params, callback) {
  params.networkName = 'Network for Stream Viewer';
  params.networkPort = 60400;

  ElementInstanceManager
    .createStreamViewerInstance(params.fabricType.streamViewerElementKey, params.userId, params.fabricInstance.uuid)
    .then(AppUtils.onCreate.bind(null, params, 'streamViewer', 'Unable to create Stream Viewer', callback));

}

const createNetworkElementInstance = function(params, callback) {
  ElementInstanceManager
    .createNetworkInstance(params.networkElement, params.userId, params.fabricInstance.uuid, params.satellite.domain, params.satellitePort.port1, params.networkName, params.networkPort)
    .then(AppUtils.onCreate.bind(null, params, 'networkElementInstance', 'Unable to create Network Element Instance', callback));

}

/**
 * @desc - this function finds the element instance which was changed
 */
const createDebugConsole = function(params, callback) {
  params.networkName = 'Network for Debug Console';
  params.networkPort = 60401;

  ElementInstanceManager
    .createDebugConsoleInstance(params.fabricType.consoleElementKey, params.userId, params.fabricInstance.uuid)
    .then(AppUtils.onCreate.bind(null, params, 'debugConsole', 'Unable to createDebug console object', callback));
}

const updateDebugConsole = function(params, callback) {
  ElementInstanceManager
    .updateByUUID(params.debugConsole.uuid, {
      'updatedBy': params.userId
    })
    .then(AppUtils.onUpdate.bind(null, params, "Unable to update 'UpdatedBy' field for DebugConsoleElement", callback));

}

const updateElemInstance = function(params, callback) {
  var updateChange = {};

  if (params.bodyParams.config) {
    updateChange.config = params.bodyParams.config;
    updateChange.configLastUpdated = params.milliseconds;
    params.isConfigChanged = true;
  }

  if (params.bodyParams.name) {
    updateChange.name = params.bodyParams.name
  }

  ElementInstanceManager
    .updateByUUID(params.bodyParams.elementId, updateChange)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Element Instance', callback));

}

const deleteNetworkElementInstance = function(params, callback) {
  ElementInstanceManager
    .deleteNetworkElement(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Element Instance found', callback));
}

const deleteElementInstance = function(params, callback) {
  ElementInstanceManager
    .deleteByElementUUID(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'Was unable to delete Element Instance', callback));
}

const deleteElementInstanceByNetworkPairing = function(params, callback) {
  ElementInstanceManager
    .deleteByElementUUID(params.networkPairing.networkElementId1)
    .then(AppUtils.onDelete.bind(null, params, 'Was unable to delete Network pairing Element Instance', callback));
}

export default {
  getElementInstance: getElementInstance,
  getElementInstancesByTrackId: getElementInstancesByTrackId,
  createElementInstance: createElementInstance,
  createStreamViewerElement: createStreamViewerElement,
  createNetworkElementInstance: createNetworkElementInstance,
  createDebugConsole: createDebugConsole,
  updateDebugConsole: updateDebugConsole,
  updateElemInstance: updateElemInstance,
  deleteNetworkElementInstance: deleteNetworkElementInstance,
  deleteElementInstance: deleteElementInstance,
  deleteElementInstanceByNetworkPairing: deleteElementInstanceByNetworkPairing,

};