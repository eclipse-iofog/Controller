/**
 * @file elementController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the end-points that deal with elements
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import querystring from 'querystring';
import https from 'https';
import ElementManager from '../../managers/elementManager';
import UserService from '../../services/userService';
import ElementService from '../../services/elementService';
import ElementInstanceService from '../../services/elementInstanceService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ChangeTrackingService from '../../services/changeTrackingService';
import NetworkPairingService from '../../services/networkPairingService';
import RoutingService from '../../services/routingService';
import SatellitePortService from '../../services/satellitePortService';
import ComsatService from '../../services/comsatService';
import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

/**
 * @desc - this end-point creates a new elementInstance
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/build/element/instance/create', (req, res) => {
  var params = {};
  params.bodyParams = req.body;

  async.waterfall([
    async.apply(UserService.getUser, params),
    ElementService.getElement,
    ElementInstanceService.createElementInstance
  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem creating the ioElement instance.' + result;

    AppUtils.sendResponse(res, err, 'elementId', result.elementInstance, errMsg);
  });
});

/**
 * @desc - this end-point updates the element instance incase of any-change
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/element/instance/update', (req, res) => {
  var params = {};

  params.bodyParams = req.body;
  params.milliseconds = new Date().getTime();

  var userId = 1; // USER ID
  var bodyParams = req.body;
  console.log(bodyParams);

  if (!bodyParams.FabricInstance) {
    res.send({
      'status': 'failure',
      'timestamp': new Date().getTime(),
      'errormessage': 'Fabric Instance Id is required'
    });
  } else {
    params.bodyParams.elementId = params.bodyParams.InstanceId;
    async.waterfall([
      async.apply(ElementInstanceService.getElementInstance, bodyParams),
      updateElementInstance, // update the fabric id
      updateChangeTracking, // update the changetracking data based on elementinstance.iofabric_uuid
      updateChange, // update the changetracking data based on the post param Fabric id
      updateElement // update the element data from incoming post params
    ], function(err, result) {
      res.status(200);
      if (err) {
        res.send({
          'status': 'failure',
          'timestamp': new Date().getTime(),
          'errormessage': result
        });
      } else {
        res.send({
          'status': 'ok',
          'timestamp': new Date().getTime(),
          'instance Id': result
        });
      }
    });
  }
});

/**
 * @desc - this function sets this element instance to a fabric
 */
function updateElementInstance(bodyParams, elementInstance, callback) {
  var data;

  if (elementInstance.iofabric_uuid === bodyParams.FabricInstance) {
    callback(null, bodyParams, elementInstance);
  } else {

    data = {
      iofabric_uuid: bodyParams.FabricInstance
    };

    ElementInstanceManager.updateByUUID(bodyParams.InstanceId, data)
      .then((updatedElement) => {
          if (updatedElement > 0) {
            callback(null, bodyParams, elementInstance);
          } else callback('error', "Unable to Update elements fabric id");
        },
        (err) => {
          callback('error', Constants.MSG.SYSTEM_ERROR);
        });
  }
}

/**
 * @desc - this function popultes objects with updated values and updates the changetraking table
 */
function updateChangeTracking(bodyParams, elementInstance, callback) {

  var lastUpdated = new Date().getTime(),
    updateChangeTracking = {},
    updateChange = {},

    updateElementObject = {
      logSize: bodyParams.LogSize,
      name: bodyParams.Name,
      config: bodyParams.Config,
      configLastUpdated: lastUpdated,
      RootHostAccess: bodyParams.RootAccess
    };

  if (elementInstance.config != bodyParams.Config) {
    updateElementObject.configLastUpdated = new Date().getTime();
    updateChangeTracking.containerConfig = new Date().getTime();
  }
  if (elementInstance.iofabric_uuid != bodyParams.FabricInstance) {

    updateChangeTracking.containerList = new Date().getTime();
    updateChangeTracking.containerConfig = new Date().getTime();

    updateChange.containerConfig = new Date().getTime();
    updateChange.containerList = new Date().getTime();

  } else if (elementInstance.RootHostAccess != bodyParams.RootAccess) {
    updateChange.containerList = new Date().getTime();
  }

  ChangeTrackingManager.updateByUuid(elementInstance.iofabric_uuid, updateChangeTracking)
    .then((updatedchange) => {
        callback(null, bodyParams, updateChange, updateElementObject);
      },
      (err) => {
        callback(null, bodyParams, updateChange, updateElementObject);
      });
}

/**
 * @desc - this function uses the populated objects to update the database values
 */
function updateChange(bodyParams, updateChange, updateElementObject, callback) {
  ChangeTrackingManager.updateByUuid(bodyParams.FabricInstance, updateChange)
    .then((changeUpdated) => {
        callback(null, bodyParams, updateElementObject);
      },
      (err) => {
        callback(null, bodyParams, updateElementObject);
      });
}
/**
 * @desc - this function updates the element instance with the new updated values
 */
function updateElement(bodyParams, updateElementObject, callback) {

  ElementInstanceManager.updateByUUID(bodyParams.InstanceId, updateElementObject)
    .then((updatedElement) => {
        if (updatedElement > 0) {
          callback(null, bodyParams.InstanceId);
        } else callback('error', "Unable to Update element instance data");
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

router.post('/api/v2/authoring/element/instance/create', (req, res) => {
  var params = {};

  params.bodyParams = req.body;
  params.milliseconds = new Date().getTime();

  async.waterfall([
    async.apply(UserService.getUser, params),
    getElement,
    createElementInstance,
    updateChangeTracking,
    getElementDetails
  ], function(err, result) {
    res.status(200);
    if (err) {
      res.send({
        'status': 'failure',
        'timestamp': new Date().getTime(),
        'errormessage': 'Internal error: There was a problem creating the ioElement instance.' + result
      });
    } else {
      res.send({
        'status': 'ok',
        'timestamp': new Date().getTime(),
        'element': result.elementInstance
      });
    }
  });
});

function getElement(params, callback) {
  ElementManager
    .findElementById(params.bodyParams.elementKey)
    .then(AppUtils.onFind.bind(null, params, 'element', Constants.MSG.SYSTEM_ERROR, callback));
}

function createElementInstance(params, callback) {
  var elementInstanceObj = {
    uuid: AppUtils.generateInstanceId(32),
    trackId: params.bodyParams.trackId,
    elementKey: params.element.id,
    config: params.bodyParams.elementConfig ? params.bodyParams.elementConfig : "{}",
    name: params.bodyParams.elementName ? params.bodyParams.elementName : "NEW ELEMENT",
    last_updated: params.milliseconds,
    updatedBy: params.user.id,
    configLastUpdated: params.milliseconds,
    isStreamViewer: false,
    isDebugConsole: false,
    isManager: false,
    isNetwork: false,
    registryId: params.element.registry_id,
    rebuild: false,
    RootHostAccess: false,
    logSize: 10
  };

  ElementInstanceManager
    .create(elementInstanceObj)
    .then(AppUtils.onCreate.bind(null, params, 'elementInstance', 'Unable to create Element Instance', callback));

}

function updateChangeTracking(params, callback) {
  var updateChange = {
    containerConfig: params.milliseconds,
    containerList: params.milliseconds
  };

  ChangeTrackingManager
    .updateByUuid(params.bodyParams.fabricInstance, updateChange)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Change Tracking for Fog instance', callback));
}

function getElementDetails(params, callback) {
  var elementInstance = {};

  elementInstance.elementId = params.elementInstance.uuid;
  elementInstance.elementKey = params.elementInstance.elementKey;
  elementInstance.config = params.elementInstance.config;
  elementInstance.name = params.elementInstance.name;

  elementInstance.elementTypeName = params.element.name;
  elementInstance.category = params.element.category;
  elementInstance.image = params.element.containerImage;
  elementInstance.publisher = params.element.publisher;
  //elementInstance.advertisedPorts = params.element.name;
  //elementInstance.openPorts = params.element.name;
  //elementInstance.routing = params.element.name;

  callback(null, {
    elementInstance: elementInstance
  });
}

router.post([
  '/api/v2/authoring/element/instance/config/update',
  '/api/v2/authoring/element/instance/name/update',
], (req, res) => {

  var params = {};

  params.bodyParams = req.body;

  async.waterfall([
    async.apply(UserService.getUser, params),
    ElementInstanceService.getElementInstance,
    ElementInstanceService.updateElemInstance,
    ChangeTrackingService.updateConfigTracking,
  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem updating ioElement instance.' + result

    AppUtils.sendResponse(res, err, 'element', params.bodyParams.elementId, errMsg);
  });
});

/**
 * @desc - this end-point deletes an elementInstance
 */
router.post('/api/v2/authoring/element/instance/delete', (req, res) => {
  var params = {};

  params.bodyParams = req.body;
  params.milliseconds = new Date().getTime();

  async.waterfall([
    async.apply(UserService.getUser, params),
    ElementInstancePortService.deleteElementInstancePort,
    RoutingService.deleteElementInstanceRouting,
    RoutingService.deleteNetworkElementRouting,
    ElementInstanceService.deleteNetworkElementInstance,
    SatellitePortService.getPasscodeForNetworkElements,
    ComsatService.closePortsOnComsat,
    NetworkPairingService.deleteNetworkPairing,
    SatellitePortService.deletePortsForNetworkElements,
    ElementInstanceService.deleteElementInstance
  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem deleting ioElement instance.' + result

    AppUtils.sendResponse(res, err, 'element', params.bodyParams.elementId, errMsg);
  });
});

export default router;