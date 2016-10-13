/**
 * @file IntegratorController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the Integrator instance
 */

import async from 'async';
import express from 'express';
import querystring from 'querystring';
import https from 'https';
const router = express.Router();
import FabricManager from '../../managers/fabricManager';
import FabricTypeManager from '../../managers/fabricTypeManager';
import FabricUserManager from '../../managers/fabricUserManager';
import StreamViewerManager from '../../managers/streamViewerManager';
import FabricProvisionKeyManager from '../../managers/fabricProvisionKeyManager';
import ChangeTrackingManager from '../../managers/changeTrackingManager';
import ElementManager from '../../managers/elementManager';
import ElementInstanceManager from '../../managers/elementInstanceManager';
import ElementInstancePortManager from '../../managers/elementInstancePortManager';
import SatelliteManager from '../../managers/satelliteManager';
import SatellitePortManager from '../../managers/satellitePortManager';
import NetworkPairingManager from '../../managers/networkPairingManager';
import ConsoleManager from '../../managers/consoleManager';
import AppUtils from '../../utils/appUtils';

/**
 * @desc - if this end-point is hit it sends a timeStamp in milliseconds back to the client
 * (Used to check if the server is active)
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/integrator/instance/create', (req, res) => {
  var params = {};

  params.userId = 1;
  params.bodyParams = req.body;

  async.waterfall([
    async.apply(createFabricInstance, params),
    initiateFabricChangeTracking,
    createFabricUser,
    getFabricTypeDetail,
    createStreamViewerElement,
    createStreamViewerPort,
    updateChangeTracking,
    getRandomSatellite,
    getMaxSatellitePort, // not required
    createSatellitePort, // change it
    getSatellitePorts,
    openPortsOnComsat,
    getNetworkElement,
    createNetworkElementInstance,
    updateChangeTrackingCL,
    createNeworkPairing,
    createStreamViewer,
    createDebugConsole,
    createDebugConsolePort,
    updateDebugConsole,
    updateChangeTrackingDebugConsole,
    getMaxSatellitePort2,
    createSatellitePort2,
    openPortsOnComsat2,
    getNetworkElement2,
    createNetworkElementInstance2,
    createNeworkPairing2,
    createConsole,
    getFabricInstanceDetails
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
        'instance': result.fabricInstance
      });
    }
  });
});

/**
 * @desc - this function finds the element instance which was changed
 */
function createFabricInstance(params, callback) {
  var fabricType = params.bodyParams.FabricType,
    instanceId = AppUtils.generateRandomString(32);

  var config = {
    uuid: instanceId,
    typeKey: fabricType
  };

  // This function creates a new fabric and inserts its data
  // in to the database, along with the default values
  FabricManager
    .createFabric(config)
    .then(onCreate.bind(null, params, 'fabricInstance', 'Unable to create Fabric Instance', callback));

}

/**
 * @desc - this function finds the element instance which was changed
 */
function initiateFabricChangeTracking(params, callback) {
  ChangeTrackingManager
    .createChangeTracking(params.fabricInstance.uuid)
    .then(onCreate.bind(null, params, null, 'Unable to initialize change tracking for Fabric Instance', callback));

}

/**
 * @desc - this function finds the element instance which was changed
 */
function createFabricUser(params, callback) {
  FabricUserManager
    .create(params.userId, params.fabricInstance.uuid)
    .then(onCreate.bind(null, params, null, 'Unable to create user for Fabric Instance', callback));

}

function getFabricTypeDetail(params, callback) {
  FabricTypeManager
    .findById(params.fabricInstance.typeKey)
    .then(onCreate.bind(null, params, 'fabricType', 'Unable to read fabric type detail', callback));

}
/**
 * @desc - this function finds the element instance which was changed
 */
function createStreamViewerElement(params, callback) {
  ElementInstanceManager
    .createStreamViewerInstance(params.fabricType.streamViewerElementKey, params.userId, params.fabricInstance.uuid)
    .then(onCreate.bind(null, params, 'streamViewer', 'Unable to create Stream Viewer', callback));

}

function createStreamViewerPort(params, callback) {
  ElementInstancePortManager
    .createElementPort(params.userId, params.streamViewer.uuid, 60400)
    .then(onCreate.bind(null, params, 'streamViewerPort', 'Unable to create Stream Viewer Port', callback));

}

function updateChangeTracking(params, callback) {
  ChangeTrackingManager
    .updateByUuid(params.fabricInstance.uuid, {
      'containerList': new Date().getTime()
    })
    .then(onUpdate.bind(null, params, 'Unable to update Change Tracking for stream Viewer', callback));

}

function getRandomSatellite(params, callback) {
  var randomNumber;

  SatelliteManager.findAll()
    .then((satellites) => {
      if (satellites && satellites.length > 0) {
        randomNumber = Math.floor((Math.random() * (satellites.length - 1)));
        params.satellite = satellites[randomNumber];
        callback(null, params);
      } else {
        callback('error', "No Satellite defined");
      }
    });
}

function getMaxSatellitePort(params, callback) {
  SatellitePortManager.getMaxPort()
    .then((maxPort) => {
      if (isNaN(maxPort)) {
        maxPort = 3000;
      }
      params.maxPort = maxPort;
      callback(null, params);
    })
}

function createSatellitePort(params, callback) {
  SatellitePortManager
    .create(params.maxPort + 1, params.maxPort + 2, params.satellite.id)
    .then(onCreate.bind(null, params, 'satellitePort', 'Unable to create satellite port', callback));

}

function getSatellitePorts(params, callback) {
  SatellitePortManager
    .findAllBySatelliteId(params.satellite.id)
    .then(onCreate.bind(null, params, 'satellitePorts', 'Unable to find satellite ports', callback));

}

function openPortsOnComsat(params, callback) {
  var data = querystring.stringify({
    mapping: '{"type":"public","maxconnections":60,"heartbeatabsencethreshold":200000}'
  });

  var options = {
    host: params.satellite.domain,
    port: 443,
    path: '/api/v2/mapping/add',
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
      var obj = JSON.parse(output);
      console.log(obj);
      callback(null, params);
    });
  });

  httpreq.on('error', function(err) {
    console.log(err);
    callback(null, params);
  });

  httpreq.write(data);
  httpreq.end();
}

function getNetworkElement(params, callback) {
  ElementManager
    .findElementById(params.fabricType.networkElementKey)
    .then(onCreate.bind(null, params, 'networkElement', 'Unable to find Element object with id ' + params.fabricType.networkElementKey, callback));

}

function createNetworkElementInstance(params, callback) {
  ElementInstanceManager
    .createNetworkInstance(params.networkElement, params.userId, params.fabricInstance.uuid, params.satellite.domain, params.satellitePort.port1, 'Network for Stream Viewer', 60400)
    .then(onCreate.bind(null, params, 'networkElementInstance', 'Unable to create Network Element Instance', callback));

}

function updateChangeTrackingCL(params, callback) {
  ChangeTrackingManager
    .updateByUuid(params.fabricInstance.uuid, {
      'containerList': new Date().getTime(),
      'containerConfig': new Date().getTime()
    })
    .then(onUpdate.bind(null, params, 'Unable to update Change Tracking for Fog Instance', callback));

}

function createNeworkPairing(params, callback) {
  var networkPairingObj = {
    instanceId1: params.fabricInstance.uuid,
    instanceId2: null,
    elementId1: params.streamViewer.uuid,
    elementId2: null,
    networkElementId1: params.networkElementInstance.uuid,
    networkElementId2: null,
    isPublicPort: true,
    element1PortId: params.streamViewerPort.id,
    satellitePortId: params.satellitePort.id
  };

  NetworkPairingManager
    .create(networkPairingObj)
    .then(onCreate.bind(null, params, null, 'Unable to create Network pairing', callback));

}

function createStreamViewer(params, callback) {
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
    .then(onCreate.bind(null, params, null, 'Unable to create Stream Viewer object', callback));

}

/**
 * @desc - this function finds the element instance which was changed
 */
function createDebugConsole(params, callback) {

  ElementInstanceManager
    .createDebugConsoleInstance(params.fabricType.consoleElementKey, params.userId, params.fabricInstance.uuid)
    .then(onCreate.bind(null, params, 'debugConsole', 'Unable to createDebug console object', callback));
}

function createDebugConsolePort(params, callback) {
  ElementInstancePortManager
    .createElementPort(params.userId, params.debugConsole.uuid, 60401)
    .then(onCreate.bind(null, params, null, 'Unable to create Debug Console Port', callback));

}

function updateDebugConsole(params, callback) {
  ElementInstanceManager
    .updateByUUID(params.debugConsole.uuid, {
      'updatedBy': params.userId
    })
    .then(onUpdate.bind(null, params, "Unable to update 'UpdatedBy' field for DebugConsoleElement", callback));

}

function updateChangeTrackingDebugConsole(params, callback) {
  ChangeTrackingManager
    .updateByUuid(params.fabricInstance.uuid, {
      'containerList': new Date().getTime()
    })
    .then(onUpdate.bind(null, params, 'Unable to update Change Tracking for Fog instance', callback));

}

function getMaxSatellitePort2(params, callback) {
  SatellitePortManager.getMaxPort()
    .then((maxPort) => {
      if (isNaN(maxPort)) {
        maxPort = 3000;
      }

      params.maxPort = maxPort;
      callback(null, params);
    })
}

function createSatellitePort2(params, callback) {
  SatellitePortManager
    .create(params.maxPort + 1, params.maxPort + 2, params.satellite.id)
    .then(onCreate.bind(null, params, 'dcSatellitePort', 'Unable to create satellite Port', callback));

}

function openPortsOnComsat2(params, callback) {
  var data = querystring.stringify({
    mapping: '{"type":"public","maxconnections":60,"heartbeatabsencethreshold":200000}'
  });

  var options = {
    host: params.satellite.domain,
    port: 443,
    path: '/api/v2/mapping/add',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  var httpreq = https.request(options, function(response) {
    var output = '';
    response.setEncoding('utf8');

    response.on('data', function(chunk) {
      output += chunk;
    });

    response.on('end', function() {
      var obj = JSON.parse(output);
      console.log(obj);
      callback(null, params);
    });
  });
  httpreq.on('error', function(err) {
    console.log(err);
    callback(null, params);
  });

  httpreq.write(data);
  httpreq.end();
}

function getNetworkElement2(params, callback) {
  ElementManager
    .findElementById(params.fabricType.networkElementKey)
    .then(onCreate.bind(null, params, 'dcElement', 'Unable to find Element object with id ' + params.fabricType.networkElementKey, callback));

}

function createNetworkElementInstance2(params, callback) {
  ElementInstanceManager
    .createNetworkInstance(params.dcElement, params.userId, params.fabricInstance.uuid, params.satellite.domain, params.dcSatellitePort.port1, 'Network for Debug Console', 60401)
    .then(onCreate.bind(null, params, 'dcNetworkElementInstance', 'Unable to create Debug console Network Element Instance', callback));

}

function createNeworkPairing2(params, callback) {
  var networkPairingObj = {
    instanceId1: params.fabricInstance.uuid,
    instanceId2: null,
    elementId1: params.debugConsole.uuid,
    elementId2: null,
    networkElementId1: params.dcNetworkElementInstance.uuid,
    networkElementId2: null,
    isPublicPort: true,
    element1PortId: params.dcSatellitePort.id,
    satellitePortId: params.satellitePort.id
  };

  NetworkPairingManager
    .create(networkPairingObj)
    .then(onCreate.bind(null, params, null, 'Unable to create Network pairing for Debug Console', callback));

}

function createConsole(params, callback) {
  var baseUrl = 'https://' + params.satellite.domain + ':' + params.satellitePort.port2,
    token = JSON.parse(params.debugConsole.config).accesstoken,
    consoleObj = {
      version: 1,
      apiBaseUrl: baseUrl,
      accessToken: token,
      elementId: params.debugConsole.uuid,
      iofabric_uuid: params.fabricInstance.uuid
    };

  ConsoleManager
    .create(consoleObj)
    .then(onCreate.bind(null, params, null, 'Unable to create Console object', callback));

}

/**
 * @desc - this function finds the element instance which was changed
 */
function getFabricInstanceDetails(params, callback) {
  var fabricInstance = params.fabricInstance.dataValues;

  fabricInstance.typeName = params.fabricType.name;
  fabricInstance.typeDescription = params.fabricType.description;
  fabricInstance.typeImage = params.fabricType.image;

  callback(null, {
    fabricInstance: fabricInstance
  });
}

function onCreate(params, paramName, errorMsg, callback, modelObject) {
  if (modelObject) {
    if (paramName) {
      params[paramName] = modelObject;
    }
    callback(null, params);

  } else {
    callback('error', errorMsg);

  }
}

function onUpdate(params, errorMsg, callback, updatedModels) {
  if (updatedModels.length > 0) {
    callback(null, params);

  } else {
    callback('error', errorMsg);

  }
}

export default router;