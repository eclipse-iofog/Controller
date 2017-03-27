import ElementInstanceManager from '../managers/elementInstanceManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const getElementInstanceProperties = function(props, params, callback) {
  var elementInstanceId = AppUtils.getProperty(params, props.elementInstanceId);

  ElementInstanceManager
    .getElementInstanceProperties(elementInstanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
}

const getDetailedElementInstances = function(props, params, callback) {
  var trackId = AppUtils.getProperty(params, props.trackId);

  ElementInstanceManager
    .getElementInstanceDetails(trackId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
}

const getElementInstance = function(props, params, callback) {
  var elementInstanceId = AppUtils.getProperty(params, props.elementInstanceId);

  ElementInstanceManager
    .findByUuId(elementInstanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
}

const getElementInstanceByUuIds = function(props, params, callback) {
  var elementInstanceId = AppUtils.getProperty(params, props.elementInstanceId);

  ElementInstanceManager
    .findByUuids(elementInstanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
}

const getElementInstancesByTrackId = function(props, params, callback) {
  var trackId = AppUtils.getProperty(params, props.trackId);

  ElementInstanceManager
    .findByTrackId(trackId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instances related to track ' + params.bodyParams.trackId, callback));
}

const findElementInstancesByTrackId = function(props, params, callback) {
  var trackId = AppUtils.getProperty(params, props.trackId);

  ElementInstanceManager
    .findByTrackId(trackId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const findByInstanceId= function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  ElementInstanceManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
}

const findRealElementInstanceByTrackId = function(props, params, callback) {
  var trackId = AppUtils.getProperty(params, props.trackId);

  ElementInstanceManager
    .findRealElementInstanceByTrackId(trackId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'ElementInstance not found.', callback));
}

const findIntraTrackByUuids = function(props, params, callback) {
  var intraTrackData = AppUtils.getProperty(params, props.intraTrackData);

  ElementInstanceManager
    .findIntraTrackByUuids(_.uniq(_.pluck(intraTrackData, props.field)))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'intraTracks not found.', callback));
}

const findExtraTrackByUuids = function(props, params, callback) {
  var extraTrackData = AppUtils.getProperty(params, props.extraTrackData);

  ElementInstanceManager
    .findExtraTrackByUuids(_.uniq(_.pluck(extraTrackData, props.field)))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'extraTracks not found.', callback));
}

const findOtherTrackDetailByUuids = function(props, params, callback) {
  var otherTrackData = AppUtils.getProperty(params, props.otherTrackData);

  ElementInstanceManager
   .findOtherTrackDetailByUuids(_.uniq(_.pluck(otherTrackData, props.field)))   
   .then(AppUtils.onFind.bind(null, params, props.setProperty , 'otherTracksDetail not found', callback));
}

const createElementInstance = function(props, params, callback) {
var userId = AppUtils.getProperty(params, props.userId),
    trackId = AppUtils.getProperty(params, props.trackId),
    name= AppUtils.getProperty(params, props.name),
    logSize = AppUtils.getProperty(params, props.logSize),
    config = AppUtils.getProperty(params, props.config),
    fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId);

    if(!config)
   {
     config = "{}";
   }
  ElementInstanceManager
    .createElementInstance(params.element, userId, trackId, config, name, logSize, fogInstanceId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Element Instance', callback));
}

const createStreamViewerElement = function(props, params, callback) {
  var elementKey = AppUtils.getProperty(params, props.elementKey),
      userId = AppUtils.getProperty(params, props.userId),
      fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId);
  
  ElementInstanceManager
    .createStreamViewerInstance(elementKey, userId, fogInstanceId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Stream Viewer', callback));
}

const createNetworkElementInstance = function(props, params, callback) {
  var networkElement = AppUtils.getProperty(params, props.networkElement),
    fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId),
    satellitePort = AppUtils.getProperty(params, props.satellitePort),
    trackId = props.trackId ? AppUtils.getProperty(params, props.trackId) : 0,
    satelliteDomain = AppUtils.getProperty(params, props.satelliteDomain),
    userId = AppUtils.getProperty(params, props.userId);

  if (!props.networkName) {
    props.networkName = 'Network for Element ' + networkElement.uuid;
  }

  ElementInstanceManager
    .createNetworkInstance(networkElement, userId, fogInstanceId, satelliteDomain, satellitePort, props.networkName, props.networkPort, props.isPublic, trackId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Network Element Instance', callback));
}

const createDebugConsole = function(props, params, callback) {
  var elementKey = AppUtils.getProperty(params, props.elementKey),
      userId = AppUtils.getProperty(params, props.userId),
      fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId);
  
  ElementInstanceManager
    .createDebugConsoleInstance(elementKey, userId, fogInstanceId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to createDebug console object', callback));
}

const updateElemInstance = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);

  ElementInstanceManager
    .updateByUUID(elementId, props.updatedData)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Element Instance', callback));
}

const updateElemInstanceByFogUuId = function(props, params, callback) {
var updateChange = {},
 fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId);

if (params.bodyParams.instanceId) {
    updateChange.iofog_uuid = props.updatedFogId
  }

 ElementInstanceManager
    .updateByFogUuId(fogInstanceId, updateChange)
    .then(AppUtils.onUpdate.bind(null, params, "Unable to update 'iofog_uuid' field for Element Instance", callback));
}

const deleteNetworkElementInstance = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);

  ElementInstanceManager
    .deleteNetworkElement(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Element Instance found', callback));
}

const deleteNetworkElementInstances = function(props, params, callback) {
  var elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  ElementInstanceManager
    .deleteNetworkElements(_.pluck(elementInstanceData, props.field1), _.pluck(elementInstanceData, props.field2))
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteElementInstance = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);
  ElementInstanceManager
    .deleteByElementUUID(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'Was unable to delete Element Instance', callback));
}

const deleteElementInstances = function(props, params, callback) {
  var elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  ElementInstanceManager
    .deleteByElementUUID(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

export default {
  createDebugConsole: createDebugConsole,
  createElementInstance: createElementInstance,
  createNetworkElementInstance: createNetworkElementInstance,
  createStreamViewerElement: createStreamViewerElement,
  findByInstanceId: findByInstanceId,
  findRealElementInstanceByTrackId: findRealElementInstanceByTrackId,
  findIntraTrackByUuids: findIntraTrackByUuids,
  findExtraTrackByUuids: findExtraTrackByUuids,
  findOtherTrackDetailByUuids: findOtherTrackDetailByUuids,
  findElementInstancesByTrackId: findElementInstancesByTrackId,
  deleteElementInstance: deleteElementInstance,
  deleteElementInstances: deleteElementInstances,
  deleteNetworkElementInstance: deleteNetworkElementInstance,
  deleteNetworkElementInstances: deleteNetworkElementInstances,
  getElementInstance: getElementInstance,
  getElementInstanceByUuIds: getElementInstanceByUuIds,
  getElementInstancesByTrackId: getElementInstancesByTrackId,
  getElementInstanceProperties: getElementInstanceProperties,
  updateElemInstance: updateElemInstance,
  updateElemInstanceByFogUuId: updateElemInstanceByFogUuId,
  getDetailedElementInstances:getDetailedElementInstances
};