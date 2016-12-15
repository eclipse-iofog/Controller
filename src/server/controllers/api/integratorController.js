/**
 * @file IntegratorController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the Integrator instance
 */

import async from 'async';
import express from 'express';
const router = express.Router();

import FabricService from '../../services/fabricService';
import FabricTypeService from '../../services/fabricTypeService';
import FabricUserService from '../../services/fabricUserService';
import StreamViewerService from '../../services/streamViewerService';
import ChangeTrackingService from '../../services/changeTrackingService';
import ElementService from '../../services/elementService';
import ElementInstanceService from '../../services/elementInstanceService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import SatelliteService from '../../services/satelliteService';
import SatellitePortService from '../../services/satellitePortService';
import NetworkPairingService from '../../services/networkPairingService';
import ConsoleService from '../../services/consoleService';
import ComsatService from '../../services/comsatService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';

/**
 * @desc - if this end-point is hit it sends a timeStamp in milliseconds back to the client
 * (Used to check if the server is active)
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/integrator/instance/create', (req, res) => {
  var params = {},
    fogTypeProps = {
      fogTypeId: 'fabricInstance.typeKey',
      setProperty: 'fabricType'
    },
    changeTrackingProps = {
      fogInstanceId: 'fabricInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime()
      }
    },
    networkElementProps = {
      networkElementId: 'fabricType.networkElementKey',
      setProperty: 'networkElement'
    },
    networkElementInstanceProps = {
      networkElement: 'networkElement',
      fogInstanceId: 'fabricInstance.uuid',
      satellitePort: 'satellitePort.port1',
      satelliteDomain: 'satellite.domain',
      trackId: null,
      userId: 'userId',
      networkName: 'Network for Stream Viewer',
      networkPort: 60400,
      isPublic: true,
      setProperty: 'networkElementInstance'
    },
    debugElementInstanceProps = {
      networkElement: 'networkElement',
      fogInstanceId: 'fabricInstance.uuid',
      satellitePort: 'satellitePort.port1',
      satelliteDomain: 'satellite.domain',
      trackId: null,
      userId: 'userId',
      networkName: 'Network for Debug Console',
      networkPort: 60401,
      isPublic: true,
      setProperty: 'networkElementInstance'
    },
    changeTrackingCLProps = {
      fogInstanceId: 'fabricInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime()
      }
    },
    networkPairingProps = {
      instanceId1: 'fabricInstance.uuid',
      instanceId2: null,
      elementId1: 'streamViewer.uuid',
      elementId2: null,
      networkElementId1: 'networkElementInstance.uuid',
      networkElementId2: null,
      isPublic: true,
      elementPortId: 'elementInstancePort.id',
      satellitePortId: 'satellitePort.id',
      setProperty: 'networkPairingObj'
    },
    debugNetworkPairingProps = {
      instanceId1: 'fabricInstance.uuid',
      instanceId2: null,
      elementId1: 'debugConsole.uuid',
      elementId2: null,
      networkElementId1: 'networkElementInstance.uuid',
      networkElementId2: null,
      isPublic: true,
      elementPortId: 'elementInstancePort.id',
      satellitePortId: 'satellitePort.id',
      setProperty: 'debugNetworkPairingObj'
    };

  params.userId = 1;
  params.bodyParams = req.body;

  async.waterfall([
    async.apply(FabricService.createFabricInstance, params),
    ChangeTrackingService.initiateFabricChangeTracking,
    FabricUserService.createFabricUser,
    async.apply(FabricTypeService.getFabricTypeDetail, fogTypeProps),
    ElementInstanceService.createStreamViewerElement,
    ElementInstancePortService.createStreamViewerPort,
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
    ComsatService.openPortOnRadomComsat,
    SatellitePortService.createSatellitePort,
    async.apply(ElementService.getNetworkElement, networkElementProps),
    async.apply(ElementInstanceService.createNetworkElementInstance, networkElementInstanceProps),
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingCLProps),
    async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps),
    StreamViewerService.createStreamViewer,
    ElementInstanceService.createDebugConsole,
    ElementInstancePortService.createDebugConsolePort,
    ElementInstanceService.updateDebugConsole,
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
    ComsatService.openPortOnRadomComsat,
    SatellitePortService.createSatellitePort,
    async.apply(ElementService.getNetworkElement, networkElementProps),
    async.apply(ElementInstanceService.createNetworkElementInstance, debugElementInstanceProps),
    async.apply(NetworkPairingService.createNetworkPairing, debugNetworkPairingProps),
    ConsoleService.createConsole,
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


router.post('/api/v2/authoring/integrator/instance/update', (req, res) => {
  var params = {},
    fogInstanceProps;

  params.bodyParams = req.body;

  fogInstanceProps = {
    fogId: 'bodyParams.instanceId',
    setProperty: 'fogInstance'
  };

  async.waterfall([
    async.apply(UserService.getUser, params),
    async.apply(FabricService.getFogInstance, fogInstanceProps),
    FabricService.updateFogInstance

  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem updating Fog instance.' + result

    AppUtils.sendResponse(res, err, 'Updated Fog', params.bodyParams.instanceId, errMsg);
  });

});

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

export default router;