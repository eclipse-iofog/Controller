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
import UserManager from '../../managers/userManager';
import ElementInstanceManager from '../../managers/elementInstanceManager';
import ElementInstancePortManager from '../../managers/elementInstancePortManager';
import ChangeTrackingManager from '../../managers/changeTrackingManager';
import NetworkPairingManager from '../../managers/networkPairingManager';
import RoutingManager from '../../managers/routingManager';
import SatellitePortManager from '../../managers/satellitePortManager';
import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

/**
 * @desc - this end-point creates a new elementInstance
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/build/element/instance/create', (req, res) => {
  var milliseconds = new Date().getTime();
  var bodyParams = req.body;
  var userId = 1; //USER ID

  console.log(bodyParams);

  async.waterfall([
    async.apply(getElement, bodyParams, userId),
    createElementInstance
  ], function(err, result) {
    res.status(200);
    if (err) {
      res.send({
        'status': 'failure',
        'timestamp': new Date().getTime(),
        'errormessage': 'Internal error: There was a problem deleting the ioElement instance.' + result
      });
    } else {
      res.send({
        'status': 'ok',
        'timestamp': new Date().getTime(),
        'elementId': result
      });
    }
  });
});

/**
 * @desc - this function gets an element and sets default values for an element instance
 */
function getElement(bodyParams, userId, callback) {

  ElementManager.findElementById(bodyParams.ElementKey)
    .then((element) => {
        if (element) {
          callback(null, bodyParams, userId, element);
        } else callback('error', "error");
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

/**
 * @desc - this function uses the default values to create a new element instance
 */
function createElementInstance(bodyParams, userId, element, callback) {
  ElementInstanceManager.createElementInstance(element, userId, bodyParams.TrackId, bodyParams.Name, bodyParams.LogSize)
    .then((rowcreated) => {
        console.log(rowcreated);
        if (rowcreated) {
          callback(null, element);
        } else {
          callback('error', "Unable to create ElementInstance");
        }
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

/**
 * @desc - this end-point updates the element instance incase of any-change
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/element/instance/update', (req, res) => {
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
    async.waterfall([
      async.apply(getElementInstance, bodyParams),
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
 * @desc - this function finds the element instance which was changed
 */
function getElementInstance(bodyParams, callback) {
  console.log(bodyParams);
  ElementInstanceManager.findByUuId(bodyParams.InstanceId)
    .then((elementInstance) => {
        if (elementInstance) {
          callback(null, bodyParams, elementInstance);
        } else callback('error', "Unable to find ElementInstance");
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

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
    async.apply(getUser, params),
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

function getUser(params, callback) {
  UserManager
    .findByToken(params.bodyParams.userId)
    .then(AppUtils.onFind.bind(null, params, 'user', 'User not found', callback));

}

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
  params.milliseconds = new Date().getTime();

  async.waterfall([
    async.apply(getUser, params),
    getElementInstance,
    updateElemInstance,
    updateConfigTracking,
  ], function(err, result) {
    res.status(200);
    if (err) {
      res.send({
        'status': 'failure',
        'timestamp': new Date().getTime(),
        'errormessage': 'Internal error: There was a problem updating ioElement instance.' + result
      });
    } else {
      res.send({
        'status': 'ok',
        'timestamp': new Date().getTime(),
        'element': params.bodyParams.elementId
      });
    }
  });
});

function getElementInstance(params, callback) {
  ElementInstanceManager
    .findByUuId(params.bodyParams.elementId)
    .then(AppUtils.onFind.bind(null, params, 'elementInstance', 'Cannot find Element Instance', callback));
}

function updateElemInstance(params, callback) {
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

function updateConfigTracking(params, callback) {
  if (params.isConfigChanged) {
    var updateChange = {
      containerConfig: params.milliseconds
    };

    ChangeTrackingManager
      .updateByUuid(params.elementInstance.iofabric_uuid, updateChange)
      .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Change Tracking for Fog instance', callback));
  } else {
    callback(null, params);
  }
}

/**
 * @desc - this end-point deletes an elementInstance
 */
router.post('/api/v2/authoring/element/instance/delete', (req, res) => {
  var params = {};

  params.bodyParams = req.body;
  params.milliseconds = new Date().getTime();

  async.waterfall([
    async.apply(getUser, params),
    deleteElementInstancePort,
    deleteElementInstanceRouting,
    deleteNetworkElementRouting,
    deleteNetworkElementInstance,
    getPasscodeForNetworkElements,
    closePortsOnComsat,
    deleteNetworkPairing,
    deletePortsForNetworkElements,
    deleteElementInstance
  ], function(err, result) {
    res.status(200);
    if (err) {
      res.send({
        'status': 'failure',
        'timestamp': new Date().getTime(),
        'errormessage': 'Internal error: There was a problem updating ioElement instance.' + result
      });
    } else {
      res.send({
        'status': 'ok',
        'timestamp': new Date().getTime(),
        'element': params.bodyParams.elementId
      });
    }
  });
});

function deleteElementInstancePort(params, callback) {
  ElementInstancePortManager
    .deleteByElementInstanceId(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Element Instance Port found', callback));
}

function deleteElementInstanceRouting(params, callback) {
  RoutingManager
    .deleteByPublishingElementId(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Element Instance Routing found', callback));
}

function deleteNetworkElementRouting(params, callback) {
  RoutingManager
    .deleteByNetworkElementInstanceId(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Element Instance Routing found', callback));
}

function deleteNetworkElementInstance(params, callback) {
  ElementInstanceManager
    .deleteNetworkElement(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Element Instance found', callback));
}

function deleteNetworkPairing(params, callback) {
  NetworkPairingManager
    .deleteByElementId(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Pariring Element found', callback));
}

function deleteElementInstance(params, callback) {
  ElementInstanceManager
    .deleteByElementUUID(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'Was unable to delete Element Instance', callback));
}

function getPasscodeForNetworkElements(params, callback) {
  SatellitePortManager
    .getPortPasscodeForNetworkElements(params.bodyParams.elementId)
    .then(AppUtils.onFind.bind(null, params, 'portPasscode', 'Cannot find satellite port pass code', callback));
}

function closePortsOnComsat(params, callback) {

  console.log(params.portPasscode[0]);
  if (params.portPasscode[0] && params.portPasscode[0].length > 0) {
    async.each(params.portPasscode[0], function(obj, callback) {
      var data = querystring.stringify({
        mappingid: obj.passcode_port1
      });
      console.log(data);

      var options = {
        host: obj.domain,
        port: 443,
        path: '/api/v2/mapping/remove',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      var httpreq = https.request(options, function(response) {
        console.log(response.statusCode);
        var output = '';
        response.setEncoding('utf8');

        response.on('data', function(chunk) {
          output += chunk;
        });

        response.on('end', function() {
          var responseObj = JSON.parse(output);
          console.log(responseObj);
          if (responseObj.errormessage) {
            params.errormessage = responseObj.errormessage;
          }
          callback();
        });
      });

      httpreq.on('error', function(err) {
        console.log(err);
        params.errormessage = JSON.stringify(err);
        callback();
      });

      httpreq.write(data);
      httpreq.end();

    }, function(err) {
      params.errormessage = JSON.stringify(err);
      callback(null, params);
    });
  } else {
    callback(null, params);
  }
}

function deletePortsForNetworkElements(params, callback) {
  SatellitePortManager
    .deletePortsForNetworkElements(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Satellite Port found', callback));
}

export default router;