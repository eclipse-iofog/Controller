import ElementInstanceManager from '../managers/elementInstanceManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';
import ElementImageService from "./elementImageService";

const getDataTrackDetails = function(props, params, callback) {
  let elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  ElementInstanceManager
    .getDataTrackDetails(_.uniq(_.pluck(elementInstanceData, props.field)))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'extraTracks not found.', callback));
}

const updateElementInstanceRebuild = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId),
    name = AppUtils.getProperty(params, props.name);

  ElementInstanceManager
    .updateByUUIDAndName(elementId, name, props.updatedData)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Element Instance', callback));
}

const getElementInstanceProperties = function(props, params, callback) {
  let elementInstanceId = AppUtils.getProperty(params, props.elementInstanceId);

  let imageProps = {
      elementId: 'ID',
      setProperty: 'elementImages'
  };

  ElementInstanceManager
    .getElementInstanceProperties(elementInstanceId)
    .then(ElementImageService.populateImagesForElements.bind(null, imageProps))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
}

const getDetailedElementInstances = function(props, params, callback) {
  let trackId = AppUtils.getProperty(params, props.trackId);

    let imageProps = {
        elementId: 'elementKey',
        setProperty: 'elementImages'
    };

  ElementInstanceManager
    .getElementInstanceDetails(trackId)
    .then(ElementImageService.populateImagesForElements.bind(null, imageProps))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
}

const getElementInstance = function(props, params, callback) {
  let elementInstanceId = AppUtils.getProperty(params, props.elementInstanceId);

  ElementInstanceManager
    .findByUuId(elementInstanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
}

const getElementInstanceWithImages = function(props, params, callback) {
    let elementInstanceId = AppUtils.getProperty(params, props.elementInstanceId);

    let imageProps = {
        elementId: 'element_key',
        setProperty: 'elementImages'
    };

    ElementInstanceManager
        .findByUuId(elementInstanceId)
        .then(ElementImageService.populateImagesForElement.bind(null, imageProps))
        .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
}

const getElementInstanceOptional = function(props, params, callback) {
  let elementInstanceId = AppUtils.getProperty(params, props.elementInstanceId);

  ElementInstanceManager
    .findByUuId(elementInstanceId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const getElementInstancesByTrackId = function(props, params, callback) {
  let trackId = AppUtils.getProperty(params, props.trackId);

  ElementInstanceManager
    .findByTrackId(trackId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instances related to track ' + params.bodyParams.trackId, callback));
}

const getElementInstancesByFogId = function(props, params, callback) {
  let fogId = AppUtils.getProperty(params, props.fogId);

  ElementInstanceManager
    .getByFogId(fogId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
}

const getElementInstancesByFogIdOptional = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  ElementInstanceManager
    .getByFogId(instanceId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const findElementInstancesByTrackId = function(props, params, callback) {
  let trackId = AppUtils.getProperty(params, props.trackId);

  ElementInstanceManager
    .findByTrackId(trackId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

// const findByInstanceId = function(props, params, callback) {
//   let instanceId = AppUtils.getProperty(params, props.instanceId);

//   ElementInstanceManager
//     .getByFogId(instanceId)
//     .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance', callback));
// }

const findElementInstancesByElementKey = function(props, params, callback) {
  let elementKey = AppUtils.getProperty(params, props.elementKey);

  ElementInstanceManager
    .findByElementKey(elementKey)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const findRealElementInstanceByTrackId = function(props, params, callback) {
  let trackId = AppUtils.getProperty(params, props.trackId);

  ElementInstanceManager
    .findRealElementInstanceByTrackId(trackId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'ElementInstance not found.', callback));
}

const findIntraTrackByUuids = function(props, params, callback) {
  let intraTrackData = AppUtils.getProperty(params, props.intraTrackData);

  ElementInstanceManager
    .findIntraTrackByUuids(_.uniq(_.pluck(intraTrackData, props.field)))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'intraTracks not found.', callback));
}

const findExtraTrackByUuids = function(props, params, callback) {
  let extraTrackData = AppUtils.getProperty(params, props.extraTrackData);

  ElementInstanceManager
    .findExtraTrackByUuids(_.uniq(_.pluck(extraTrackData, props.field)))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'extraTracks not found.', callback));
}

const findOtherTrackDetailByUuids = function(props, params, callback) {
  let otherTrackData = AppUtils.getProperty(params, props.otherTrackData);

  ElementInstanceManager
   .findOtherTrackDetailByUuids(_.uniq(_.pluck(otherTrackData, props.field)))   
   .then(AppUtils.onFind.bind(null, params, props.setProperty , 'otherTracksDetail not found', callback));
}

const createElementInstance = function(props, params, callback) {
let userId = AppUtils.getProperty(params, props.userId),
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

const createElementInstanceObj = function(props, params, callback) {

  ElementInstanceManager
    .createElementInstanceObj(props.elementInstance)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Element Instance', callback));
}

const createStreamViewerElement = function(props, params, callback) {
  let elementKey = AppUtils.getProperty(params, props.elementKey),
      userId = AppUtils.getProperty(params, props.userId),
      fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId),
      registryId = AppUtils.getProperty(params, props.registryId);

  ElementInstanceManager
    .createStreamViewerInstance(elementKey, userId, fogInstanceId, registryId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Stream Viewer', callback));
}

const createNetworkElementInstance = function(props, params, callback) {
  let networkElement = AppUtils.getProperty(params, props.networkElement),
    fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId),
    satellitePort = AppUtils.getProperty(params, props.satellitePort),
    trackId = props.trackId ? AppUtils.getProperty(params, props.trackId) : 0,
    satelliteDomain = AppUtils.getProperty(params, props.satelliteDomain),
    passcode = AppUtils.getProperty(params, props.passcode),
    userId = AppUtils.getProperty(params, props.userId);

  if (!props.networkName) {
    props.networkName = 'Network for Element ' + networkElement.id;
  }

  ElementInstanceManager
    .createNetworkInstance(networkElement, userId, fogInstanceId, satelliteDomain, satellitePort, passcode, props.networkName, props.networkPort, props.isPublic, trackId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Network Element Instance', callback));
}

const createDebugConsole = function(props, params, callback) {
  let elementKey = AppUtils.getProperty(params, props.elementKey),
      userId = AppUtils.getProperty(params, props.userId),
      fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId),
      registryId = AppUtils.getProperty(params, props.registryId);
  
  ElementInstanceManager
    .createDebugConsoleInstance(elementKey, userId, fogInstanceId, registryId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to createDebug console object', callback));
}

const updateElemInstance = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  ElementInstanceManager
    .updateByUUID(elementId, props.updatedData)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Element Instance', callback));
}

const updateElemInstanceByFogUuId = function(props, params, callback) {
let updateChange = {},
 fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId);

if (params.bodyParams.instanceId) {
    updateChange.iofog_uuid = props.updatedFogId
  }

 ElementInstanceManager
    .updateByFogUuId(fogInstanceId, updateChange)
    .then(AppUtils.onUpdate.bind(null, params, "Unable to update 'iofog_uuid' field for Element Instance", callback));
}

const deleteNetworkElementInstance = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  ElementInstanceManager
    .deleteNetworkElement(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Element Instance found', callback));
}

const deleteNetworkElementInstances = function(props, params, callback) {
  let elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  ElementInstanceManager
    .deleteNetworkElements(_.pluck(elementInstanceData, props.field1), _.pluck(elementInstanceData, props.field2))
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteElementInstance = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);
  ElementInstanceManager
    .deleteByElementUUID(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'Was unable to delete Element Instance', callback));
}

const deleteElementInstanceOptional = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);
  ElementInstanceManager
    .deleteByElementUUID(elementId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteElementInstances = function(props, params, callback) {
  let elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  ElementInstanceManager
    .deleteByElementUUID(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}
const deleteElementInstancesByInstanceIdAndElementKey = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId),
    elementKey = AppUtils.getProperty(params, props.elementKey);

  ElementInstanceManager
    .deleteElementInstancesByInstanceIdAndElementKey(instanceId, elementKey)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteDebugConsoleInstances = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  ElementInstanceManager
    .deleteDebugConsoleInstances(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteStreamViewerInstances = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  ElementInstanceManager
    .deleteStreamViewerInstances(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}


const getElementInstanceRouteDetails = function(props, params, callback) {
  let elementInstanceId = AppUtils.getProperty(params, props.elementInstanceId);

  ElementInstanceManager
    .getElementInstanceRoute(elementInstanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find element Instance route.', callback));
}

export default {
  createDebugConsole: createDebugConsole,
  createElementInstance: createElementInstance,
  createElementInstanceObj: createElementInstanceObj,
  createNetworkElementInstance: createNetworkElementInstance,
  createStreamViewerElement: createStreamViewerElement,
  // findByInstanceId: findByInstanceId,
  findElementInstancesByElementKey: findElementInstancesByElementKey,
  findRealElementInstanceByTrackId: findRealElementInstanceByTrackId,
  findIntraTrackByUuids: findIntraTrackByUuids,
  findExtraTrackByUuids: findExtraTrackByUuids,
  findOtherTrackDetailByUuids: findOtherTrackDetailByUuids,
  findElementInstancesByTrackId: findElementInstancesByTrackId,
  deleteDebugConsoleInstances: deleteDebugConsoleInstances,
  deleteStreamViewerInstances: deleteStreamViewerInstances,
  deleteElementInstance: deleteElementInstance,
  deleteElementInstanceOptional: deleteElementInstanceOptional,
  deleteElementInstances: deleteElementInstances,
  deleteNetworkElementInstance: deleteNetworkElementInstance,
  deleteNetworkElementInstances: deleteNetworkElementInstances,
  deleteElementInstancesByInstanceIdAndElementKey: deleteElementInstancesByInstanceIdAndElementKey,
  getDataTrackDetails: getDataTrackDetails,
  getElementInstance: getElementInstance,
  getElementInstanceOptional: getElementInstanceOptional,
  getElementInstancesByTrackId: getElementInstancesByTrackId,
  getElementInstanceProperties: getElementInstanceProperties,
  updateElemInstance: updateElemInstance,
  updateElemInstanceByFogUuId: updateElemInstanceByFogUuId,
  updateElementInstanceRebuild: updateElementInstanceRebuild,
  getDetailedElementInstances:getDetailedElementInstances,
  getElementInstanceRouteDetails: getElementInstanceRouteDetails,
  getElementInstancesByFogId: getElementInstancesByFogId,
  getElementInstancesByFogIdOptional: getElementInstancesByFogIdOptional,
  getElementInstanceWithImages: getElementInstanceWithImages
};