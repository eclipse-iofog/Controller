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
  var userId = 1,
    bodyParams = req.body;

  async.waterfall([
    async.apply(createFabricInstance, userId, bodyParams),
    initiateFabricChangeTracking,
    createFabricUser,
    getFabricTypeDetail,
    createStreamViewerElement,
    createStreamViewerPort,
    updateChangeTracking,
    getRandomSatellite,
    getMaxSatellitePort,
    createSatellitePort,
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
function createFabricInstance(userId, bodyParams, callback) {
  var fabricType = bodyParams.FabricType,
    instanceId = AppUtils.generateRandomString(32);

  var config = {
    uuid: instanceId,
    typeKey: fabricType
  };

  // This function creates a new fabric and inserts its data
  // in to the database, along with the default values
  FabricManager.createFabric(config)
    .then((fabricInstance) => {
      console.log(fabricInstance);
      if (fabricInstance) {
        callback(null, userId, bodyParams, fabricInstance);

      } else {
        callback('error', "Unable to create Fabric Instance");

      }
    });
}

/**
 * @desc - this function finds the element instance which was changed
 */
function initiateFabricChangeTracking(userId, bodyParams, fabricInstance, callback) {
  ChangeTrackingManager.createChangeTracking(fabricInstance.uuid)
    .then((changeTrackingObj) => {
      if (changeTrackingObj) {
        callback(null, userId, bodyParams, fabricInstance);

      } else {
        callback('error', "Unable to initialize change tracking for Fabric Instance");

      }
    });
}

/**
 * @desc - this function finds the element instance which was changed
 */
function createFabricUser(userId, bodyParams, fabricInstance, callback) {
  FabricUserManager.create(userId, fabricInstance.uuid)
    .then((fabricUser) => {
      if (fabricUser) {
        callback(null, userId, bodyParams, fabricInstance);

      } else {
        callback('error', "Unable to create user for Fabric Instance");

      }
    });
}

function getFabricTypeDetail(userId, bodyParams, fabricInstance, callback) {
  FabricTypeManager.findById(fabricInstance.typeKey)
    .then((fabricType) => {
      if (fabricType) {
        callback(null, userId, bodyParams, fabricInstance, fabricType);

      } else {
        callback('error', "Unable to create user for Fabric Instance");

      }
    })
}
/**
 * @desc - this function finds the element instance which was changed
 */
function createStreamViewerElement(userId, bodyParams, fabricInstance, fabricType, callback) {
  ElementInstanceManager.createStreamViewerInstance(fabricType.streamViewerElementKey, userId, fabricInstance.uuid)
    .then((streamViewObj) => {
      if (streamViewObj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewObj);

      } else {
        callback('error', "Unable to create Stream Viewer");

      }
    });
}

function createStreamViewerPort(userId, bodyParams, fabricInstance, fabricType, streamViewer, callback) {
  ElementInstancePortManager.createElementPort(userId, streamViewer.uuid, 60400)
    .then((streamViewerPort) => {
      if (streamViewerPort) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort);

      } else {
        callback('error', "Unable to create Stream Viewer Port");

      }
    })
}

function updateChangeTracking(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, callback) {
  ChangeTrackingManager.updateByUuid(fabricInstance.uuid, {
    'containerList': new Date().getTime()
  }).then((updatedElement) => {
    if (updatedElement.length > 0) {
      callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort);

    } else {
      callback('error', "Unable to update Change Tracking for Stream Viewer");

    }
  });
}

function getRandomSatellite(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, callback) {
  var randomNumber;

  SatelliteManager.findAll()
    .then((satellites) => {
      if (satellites && satellites.length > 0) {
        randomNumber = Math.floor((Math.random() * (satellites.length - 1)));
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellites[randomNumber]);
      } else {
        callback('error', "No Satellite defined");
      }
    });
}

function getMaxSatellitePort(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, callback) {
  SatellitePortManager.getMaxPort()
    .then((maxPort) => {
      if (isNaN(maxPort)) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, 3000);
      } else {
        console.log(2);
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, maxPort);
      }
    })
}

function createSatellitePort(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, maxPort, callback) {
  SatellitePortManager.create(maxPort + 1, maxPort + 2, satellite.id)
    .then((satellitePort) => {
      if (satellitePort) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort);
      } else {
        callback('error', "Unable to create satellite port");
      }
    })
}

function getSatellitePorts(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, callback) {
  SatellitePortManager.findAllBySatelliteId(satellite.id)
    .then((satellitePorts) => {
      if (satellitePorts) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts);

      } else {
        callback('error', "Unable to find satellite ports");

      }
    });
}

function openPortsOnComsat(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, callback) {
  var data = querystring.stringify({
    mapping: '{"type":"public","maxconnections":60,"heartbeatabsencethreshold":200000}'
  });

  var options = {
    host: satellite.domain,
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
      callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts);
    });
  });
  httpreq.write(data);
  httpreq.end();
}

function getNetworkElement(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, callback) {
  ElementManager.findElementById(fabricType.networkElementKey)
    .then((elementObj) => {
      if (elementObj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, elementObj);
      } else {
        callback('error', "Unable to find Element object with id " + fabrictype.networkElementKey);
      }
    });
}

function createNetworkElementInstance(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, element, callback) {
  ElementInstanceManager.createNetworkInstance(element, userId, fabricInstance.uuid, satellite.domain, satellitePort.port1, 'Network for Stream Viewer', 60400)
    .then((networkElementInstance) => {
      if (networkElementInstance) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance);

      } else {
        callback('error', 'Unable to create Network Element Instance');

      }
    });
}

function updateChangeTrackingCL(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, callback) {
  ChangeTrackingManager.updateByUuid(fabricInstance.uuid, {
    'containerList': new Date().getTime(),
    'containerConfig': new Date().getTime()
  }).then((updatedElement) => {
    if (updatedElement.length > 0) {
      callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance);

    } else {
      callback('error', "Unable to update Change Tracking for Fog Instance");

    }
  });
}

function createNeworkPairing(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, callback) {
  var networkPairingObj = {
    instanceId1: fabricInstance.uuid,
    instanceId2: null,
    elementId1: streamViewer.uuid,
    elementId2: null,
    networkElementId1: networkElementInstance.uuid,
    networkElementId2: null,
    isPublicPort: true,
    element1PortId: streamViewerPort.id,
    satellitePortId: satellitePort.id
  };

  console.log(networkPairingObj);

  NetworkPairingManager.create(networkPairingObj)
    .then((obj) => {
      console.log(obj);
      if (obj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance);

      } else {
        callback('error', "Unable to create Network pairing");

      }
    });
}

function createStreamViewer(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, callback) {
  var baseUrl = 'https://' + satellite.domain + ':' + satellitePort.port2,
    token = JSON.parse(streamViewer.config).accesstoken,
    streamViewerObj = {
      version: 1,
      apiBaseUrl: baseUrl,
      accessToken: token,
      elementId: streamViewer.uuid,
      iofabric_uuid: fabricInstance.uuid
    };

  StreamViewerManager.create(streamViewerObj)
    .then((obj) => {
      if (obj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance);

      } else {
        callback('error', "Unable to create Stream Viewer object");

      }
    });
}

/**
 * @desc - this function finds the element instance which was changed
 */
function createDebugConsole(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, callback) {

  ElementInstanceManager.createDebugConsoleInstance(fabricType.consoleElementKey, userId, fabricInstance.uuid)
    .then((debugConsoleObj) => {
      if (debugConsoleObj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsoleObj);

      } else {
        callback('error', "Unable to create Debug console object");

      }
    });
}

function createDebugConsolePort(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, callback) {
  ElementInstancePortManager.createElementPort(userId, debugConsole.uuid, 60401)
    .then((debugConsolePort) => {
      if (debugConsolePort) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole);

      } else {
        callback('error', "Unable to create Debug Console Port");

      }
    })
}

function updateDebugConsole(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, callback) {
  ElementInstanceManager.updateByUUID(debugConsole.uuid, {
    'updatedBy': userId
  }).then((updatedElement) => {
    if (updatedElement.length > 0) {
      callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole);

    } else {
      callback('error', "Unable to update 'UpdatedBy' field for DebugConsoleElement");

    }
  });
}

function updateChangeTrackingDebugConsole(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, callback) {
  ChangeTrackingManager.updateByUuid(fabricInstance.uuid, {
    'containerList': new Date().getTime()
  }).then((updatedElement) => {
    if (updatedElement.length > 0) {
      callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole);

    } else {
      callback('error', "Unable to update Change Tracking for Fog instance");

    }
  });
}

function getMaxSatellitePort2(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, callback) {
  SatellitePortManager.getMaxPort()
    .then((maxPort) => {
      if (isNaN(maxPort)) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, 3000);
      } else {
        console.log(2);
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, maxPort);
      }
    })
}

function createSatellitePort2(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, maxPort, callback) {
  SatellitePortManager.create(maxPort + 1, maxPort + 2, satellite.id)
    .then((dcSatellitePort) => {
      if (dcSatellitePort) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort);
      } else {
        callback('error', "Unable to create satellite port");
      }
    })
}

function openPortsOnComsat2(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort, callback) {
  var data = querystring.stringify({
    mapping: '{"type":"public","maxconnections":60,"heartbeatabsencethreshold":200000}'
  });

  var options = {
    host: satellite.domain,
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
      callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort);
    });
  });
  httpreq.write(data);
  httpreq.end();
}

function getNetworkElement2(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort, callback) {
  ElementManager.findElementById(fabricType.networkElementKey)
    .then((elementObj) => {
      if (elementObj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort, elementObj);
      } else {
        callback('error', "Unable to find Element object with id " + fabrictype.networkElementKey);
      }
    });
}

function createNetworkElementInstance2(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort, element, callback) {
  ElementInstanceManager.createNetworkInstance(element, userId, fabricInstance.uuid, satellite.domain, dcSatellitePort.port1, 'Network for Debug Console', 60401)
    .then((dcNetworkElementInstance) => {
      if (dcNetworkElementInstance) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort, dcNetworkElementInstance);

      } else {
        callback('error', 'Unable to create Debug console Network Element Instance');

      }
    });
}

function createNeworkPairing2(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort, dcNetworkElementInstance, callback) {
  var networkPairingObj = {
    instanceId1: fabricInstance.uuid,
    instanceId2: null,
    elementId1: debugConsole.uuid,
    elementId2: null,
    networkElementId1: dcNetworkElementInstance.uuid,
    networkElementId2: null,
    isPublicPort: true,
    element1PortId: dcSatellitePort.id,
    satellitePortId: satellitePort.id
  };

  console.log(networkPairingObj);

  NetworkPairingManager.create(networkPairingObj)
    .then((obj) => {
      if (obj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort, dcNetworkElementInstance);

      } else {
        callback('error', "Unable to create Network pairing for Debug Console");

      }
    });
}

function createConsole(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort, dcNetworkElementInstance, callback) {
  var baseUrl = 'https://' + satellite.domain + ':' + satellitePort.port2,
    token = JSON.parse(debugConsole.config).accesstoken,
    consoleObj = {
      version: 1,
      apiBaseUrl: baseUrl,
      accessToken: token,
      elementId: debugConsole.uuid,
      iofabric_uuid: fabricInstance.uuid
    };

  ConsoleManager.create(consoleObj)
    .then((obj) => {
      if (obj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort, dcNetworkElementInstance);

      } else {
        callback('error', "Unable to create Console object");

      }
    });
}

/**
 * @desc - this function finds the element instance which was changed
 */
function getFabricInstanceDetails(userId, bodyParams, fabricInstance, fabricType, streamViewer, streamViewerPort, satellite, satellitePort, satellitePorts, networkElementInstance, debugConsole, dcSatellitePort, dcNetworkElementInstance, callback) {
  fabricInstance = fabricInstance.dataValues;
  fabricInstance.typeName = fabricType.name;
  fabricInstance.typeDescription = fabricType.description;
  fabricInstance.typeImage = fabricType.image;

  callback(null, {
    fabricInstance: fabricInstance
  });
}

export default router;