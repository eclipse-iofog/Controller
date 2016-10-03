/**
 * @file IntegratorController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the Integrator instance
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import FabricManager from '../../managers/fabricManager';
import FabricTypeManager from '../../managers/fabricTypeManager';
import FabricUserManager from '../../managers/fabricUserManager';
import StreamViewerManager from '../../managers/streamViewerManager';
import ConsoleManager from '../../managers/consoleManager';
import FabricProvisionKeyManager from '../../managers/fabricProvisionKeyManager';
import ChangeTrackingManager from '../../managers/changeTrackingManager';
import ElementManager from '../../managers/elementManager';
import ElementInstanceManager from '../../managers/elementInstanceManager';
import ElementInstancePortManager from '../../managers/elementInstancePortManager';
import SatelliteManager from '../../managers/satelliteManager';
import SatellitePortManager from '../../managers/satellitePortManager';
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
    createStreamViewer,
    createStreamViewerPort,
    updateChangeTracking,
    getRandomSatellite,
    getMaxSatellitePort,
    createSatellitePort,
    getSatellitePorts,
    openPortsOnComsat,
    getNetworkElement,
    createNetworkElementInstance,
    createDebugConsole,
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
        'instance Id': result
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
function createStreamViewer(userId, bodyParams, fabricInstance, fabricType, callback) {
  ElementInstanceManager.createStreamViewerInstance(fabricType.streamViewerElementKey, userId, fabricInstance.uuid)
    .then((streamViewObj) => {
      if (streamViewObj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewObj);

      } else {
        callback('error', "Unable to create Stream Viewer");

      }
    })
}

function createStreamViewerPort(userId, bodyParams, fabricInstance, fabricType, streamViewer, callback) {
  ElementInstancePortManager.createStreamViewerPort(userId, streamViewer.id)
    .then((port) => {
      if (port) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, streamViewer);

      } else {
        callback('error', "Unable to create Stream Viewer Port");

      }
    })
}

function updateChangeTracking(userId, bodyParams, fabricInstance, fabricType, streamViewer, callback) {
  ChangeTrackingManager.updateByUuid(fabricInstance.uuid, {
    'containerList': new Date().getTime()
  }).then((updatedElement) => {
    if (updatedElement.length > 0) {
      callback(null, userId, bodyParams, fabricInstance, fabricType);

    } else {
      callback('error', "Unable to update Change Tracking for Stream Viewer");

    }
  });
}

function getRandomSatellite(userId, bodyParams, fabricInstance, fabricType, callback) {
  var randomNumber;

  SatelliteManager.findAll()
    .then((satellites) => {
      if (satellites && satellites.length > 0) {
        randomNumber = Math.floor((Math.random() * satellites.length - 1));
        callback(null, userId, bodyParams, fabricInstance, fabricType, satellites[randomNumber]);
      } else {
        callback('error', "No Satellite defined");
      }
    });
}

function getMaxSatellitePort(userId, bodyParams, fabricInstance, fabricType, satellite, callback) {
  SatellitePortManager.getMaxPort()
    .then((maxPort) => {
      if (isNaN(maxPort)) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, satellite, 3000);
      } else {
        console.log(2);
        callback(null, userId, bodyParams, fabricInstance, fabricType, satellite, maxPort);
      }
    })
}

function createSatellitePort(userId, bodyParams, fabricInstance, fabricType, satellite, maxPort, callback) {
  SatellitePortManager.create(maxPort + 1, maxPort + 2, satellite.id)
    .then((satellitePort) => {
      if (satellitePort) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort);
      } else {
        callback('error', "Unable to create satellite port");
      }
    })
}

function getSatellitePorts(userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, callback) {
  SatellitePortManager.findAllBySatelliteId(satellite.id)
    .then((satellitePorts) => {
      if (satellitePorts) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts);

      } else {
        callback('error', "Unable to find satellite ports");

      }
    });
}

function openPortsOnComsat(userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts, callback) {
  var satelliteUrl = "https://" + satellite.domain + '/api/v1/mapping/add',
    object1 = {
      id: satellitePort.id,
      port1: satellitePort.port1,
      port2: satellitePort.port2,
      maxconnectionsport1: satellitePort.maxConnectionsPort1,
      maxconnectionsport2: satellitePort.maxConnectionsPort2,
      passcodeport1: satellitePort.passcodePort1,
      passcodeport2: satellitePort.passcodePort2,
      heartbeatabsencethresholdport1: satellitePort.heartBeatAbsenceThresholdPort1,
      heartbeatabsencethresholdport2: satellitePort.heartBeatAbsenceThresholdPort2,


    };

  callback(null, userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts);

  /*
    //Prepare the start of the POST data
    //      $postString = 'mapping='.json_encode($singleMap);
    //      $postString. = '&config=';

    //Create the new config dictionary with an array of mapping objects
    $configDict = array();
    $mappingsArray = array();

    //We have to get the set of mappings for this particular Comsat using direct SQL
    $fullSetSQL = "SELECT * FROM ult_Object_Data_SatellitePorts WHERE SatelliteID = $satID";
    $myDat3 = new Data();
    $myDat3 - > Select($fullSetSQL);

    if ($myDat3 - > Count() > 0) {
      $localData = $myDat3 - > data;

      for ($i = 0; $i < count($localData); $i++) {
        $curMapping = $localData[$i];
        $tmpDict = array();

        $tmpDict["id"] = intval($curMapping["ID"]);
        $tmpDict["port1"] = $curMapping["Port1"];
        $tmpDict["port2"] = $curMapping["Port2"];
        $tmpDict["maxconnectionsport1"] = $curMapping["MaxConnectionsPort1"];
        $tmpDict["maxconnectionsport2"] = $curMapping["MaxConnectionsPort2"];
        $tmpDict["passcodeport1"] = $curMapping["PassCodePort1"];
        $tmpDict["passcodeport2"] = $curMapping["PassCodePort2"];
        $tmpDict["heartbeatabsencethresholdport1"] = $curMapping["HeartbeatAbsenceThresholdPort1"];
        $tmpDict["heartbeatabsencethresholdport2"] = $curMapping["HeartbeatAbsenceThresholdPort2"];

        $mappingsArray[] = $tmpDict;
      }

      $configDict["mappings"] = $mappingsArray;

      //Add the confg string to the POST data
      $postString. = json_encode($configDict);

      //$postData = 'mapping={"id": 1,"port1": 34778,"port2": 34777,"maxconnectionsport1":60,"maxconnectionsport2":0,"passcodeport1":"Q8bT2ss0DwE26Bax","passcodeport2":"","heartbeatabsencethresholdport1":60000,"heartbeatabsencethresholdport2":0}&config={"mappings":[{"id": 1,"port1": 34778,"port2": 34777,"maxconnectionsport1":60,"maxconnectionsport2":0,"passcodeport1":"Q8bT2ss0DwE26Bax","passcodeport2":"","heartbeatabsencethresholdport1":60000,"heartbeatabsencethresholdport2":0}]}';

      //Use cURL to talk to the Comsat
      $ch = curl_init($satURL);
      curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
      curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
      curl_setopt($ch, CURLOPT_POST, 1);
      curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded'));
      curl_setopt($ch, CURLOPT_CAINFO, ($_SERVER["DOCUMENT_ROOT"].
        "/certs/server-intermediate-wildcard.crt"));
      curl_setopt($ch, CURLOPT_SSLKEY, ($_SERVER["DOCUMENT_ROOT"].
        "/certs/server-basic-wildcard.key"));
      curl_setopt($ch, CURLOPT_SSLCERT, ($_SERVER["DOCUMENT_ROOT"].
        "/certs/server-basic-wildcard.pem"));
      curl_setopt($ch, CURLOPT_POSTFIELDS, $postString);
      $htmlResult = curl_exec($ch);
      $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
      curl_close($ch);

      //If we received a 200 OK reponse, return true. Otherwise return false
      if ($httpCode == 200) {
        return true;
      } else {
        return false;
      }*/
}

function getNetworkElement(userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts, callback) {
  ElementManager.findElementById(fabricType.networkElementKey)
    .then((elementObj) => {
      if (elementObj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts, elementObj);
      } else {
        callback('error', "Unable to find Element object with id " + fabrictype.networkElementKey);
      }
    });
}

function createNetworkElementInstance(userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts, element, callback) {
  ElementInstanceManager.createNetworkInstance(element, userId, fabricInstance.uuid, satellite.domain, satellitePort.port1)
    .then((elementInstanceObj) => {
      if (elementInstanceObj) {
        callback(null, userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts, elementObj);
      } else {
        callback('error', 'Unable to create Network Element Instance');
      }
    });
}


/**
 * @desc - this function finds the element instance which was changed
 */
function createDebugConsole(userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts, element, callback) {
  callback(null, userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts, elementObj);
}

/**
 * @desc - this function finds the element instance which was changed
 */
function getFabricInstanceDetails(userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts, element, callback) {
  callback(null, userId, bodyParams, fabricInstance, fabricType, satellite, satellitePort, satellitePorts, elementObj);
}

export default router;