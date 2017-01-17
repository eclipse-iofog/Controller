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

router.post('/api/v2/authoring/integrator/instance/create', (req, res) => {
  var params = {},

    userProps = {
      userId: 'bodyParams.userId',
      setProperty: 'user'
    },

    createFogProps = {
      fabricType: 'bodyParams.fabricType',
      setProperty: 'fabricInstance'
    },
    
    createFogUserProps = {
      userId: 'user.id',
      instanceId: 'fabricInstance.uuid',
      setProperty: null
    },

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

  params.bodyParams = req.body;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FabricService.createFogInstance, createFogProps),
    ChangeTrackingService.initiateFabricChangeTracking,
    async.apply(FabricUserService.createFogUser, createFogUserProps),
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

    AppUtils.sendResponse(res, err, 'instance', result.fabricInstance, result);
  });
});

router.post('/api/v2/authoring/integrator/instance/update', (req, res) => {
  var params = {},
      userProps = {
        userId: 'bodyParams.userId',
        setProperty: 'user'
      },

      fogInstanceProps = {
        fogId: 'bodyParams.instanceId',
        setProperty: 'fogInstance'
      };
  
  params.bodyParams = req.body;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FabricService.getFogInstance, fogInstanceProps),
    updateFogInstance

  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem updating Fog instance.' + result
    AppUtils.sendResponse(res, err, 'Updated Fog', params.bodyParams.instanceId, errMsg);
  });
});

const updateFogInstance = function(params, callback){
  var fogInstanceProps = {
        instanceId: 'bodyParams.instanceId',
        updatedFog: {
          name : params.bodyParams.name,
          location : params.bodyParams.location,
          latitude : params.bodyParams.latitude,
          longitude : params.bodyParams.longitude,
          description : params.bodyParams.description
        }
      };
  FabricService.updateFogInstance(fogInstanceProps, params, callback);
}

const getFabricInstanceDetails = function(params, callback) {
  var fabricInstance = params.fabricInstance.dataValues;

  fabricInstance.typeName = params.fabricType.name;
  fabricInstance.typeDescription = params.fabricType.description;
  fabricInstance.typeImage = params.fabricType.image;

  callback(null, {
    fabricInstance: fabricInstance
  });
}

export default router;