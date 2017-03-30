/**
 * @file IntegratorController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the Integrator instance
 */
import async from 'async';

import ChangeTrackingService from '../../services/changeTrackingService';
import ComsatService from '../../services/comsatService';
import ConsoleService from '../../services/consoleService';
import ElementService from '../../services/elementService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ElementInstanceService from '../../services/elementInstanceService';
import FogService from '../../services/fogService';
import FogTypeService from '../../services/fogTypeService';
import FogUserService from '../../services/fogUserService';
import NetworkPairingService from '../../services/networkPairingService';
import SatelliteService from '../../services/satelliteService';
import SatellitePortService from '../../services/satellitePortService';
import StreamViewerService from '../../services/streamViewerService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';

/********************************************* EndPoints ******************************************************/

/*************** Integrator Instance Create EndPoint (Post: /api/v2/authoring/integrator/instance/create) ************/
const integratorInstanceCreateEndPoint = function(req, res){
  logger.info("Endpoint hitted: "+ req.originalUrl);
  var params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    createFogProps = {
      name: 'bodyParams.name',
      location: 'bodyParams.location',
      latitude: 'bodyParams.latitude',
      longitude: 'bodyParams.longitude',
      description: 'bodyParams.description',
      fogType: 'bodyParams.fabricType',
      setProperty: 'fogInstance'
    },
    
    createFogUserProps = {
      userId: 'user.id',
      instanceId: 'fogInstance.uuid',
      setProperty: null
    },

    fogTypeProps = {
      fogTypeId: 'fogInstance.typeKey',
      setProperty: 'fogType'
    },

    streamViewerProps = {
      userId : 'user.id',
      internalPort : 80,
      externalPort : 60400,
      elementId : 'streamViewer.uuid',
      setProperty: 'elementInstancePort'
    },

    debugConsoleProps = {
      userId : 'user.id',
      internalPort : 80,
      externalPort : 60401,
      elementId : 'debugConsole.uuid',
    },

    changeTrackingProps = {
      fogInstanceId: 'fogInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime()
      }
    },
    networkElementProps = {
      networkElementId: 'fogType.networkElementKey',
      setProperty: 'networkElement'
    },
    networkElementInstanceProps = {
      networkElement: 'networkElement',
      fogInstanceId: 'fogInstance.uuid',
      satellitePort: 'satellitePort.port1',
      satelliteDomain: 'satellite.domain',
      trackId: null,
      userId: 'user.id',
      networkName: 'Network for Stream Viewer',
      networkPort: 60400,
      isPublic: true,
      setProperty: 'networkElementInstance'
    },
    debugElementInstanceProps = {
      networkElement: 'networkElement',
      fogInstanceId: 'fogInstance.uuid',
      satellitePort: 'satellitePort.port1',
      satelliteDomain: 'satellite.domain',
      trackId: null,
      userId: 'user.id',
      networkName: 'Network for Debug Console',
      networkPort: 60401,
      isPublic: true,
      setProperty: 'networkElementInstance'
    },
    changeTrackingCLProps = {
      fogInstanceId: 'fogInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime()
      }
    },
    networkPairingProps = {
      instanceId1: 'fogInstance.uuid',
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
      instanceId1: 'fogInstance.uuid',
      instanceId2: null,
      elementId1: 'debugConsole.uuid',
      elementId2: null,
      networkElementId1: 'networkElementInstance.uuid',
      networkElementId2: null,
      isPublic: true,
      elementPortId: 'elementInstancePort.id',
      satellitePortId: 'satellitePort.id',
      setProperty: 'debugNetworkPairingObj'
    },
    createChangeTrackingProps = {
      fogInstanceId: 'fogInstance.uuid',
      setProperty: null
    },
    streamViewerElementInstanceProps = {
      elementKey: 'fogType.streamViewerElementKey',
      userId: 'user.id',
      fogInstanceId:'fogInstance.uuid',
      setProperty: 'streamViewer'
    },
    debugConsoleElementInstanceProps = {
      elementKey: 'fogType.consoleElementKey',
      userId: 'user.id',
      fogInstanceId:'fogInstance.uuid',
      setProperty: 'debugConsole'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FogService.createFogInstance, createFogProps),
    async.apply(ChangeTrackingService.createFogChangeTracking, createChangeTrackingProps),
    async.apply(FogUserService.createFogUser, createFogUserProps),
    async.apply(FogTypeService.getFogTypeDetail, fogTypeProps),
    async.apply(ElementInstanceService.createStreamViewerElement,  streamViewerElementInstanceProps),
    async.apply(ElementInstancePortService.createElementInstancePortByPortValue, streamViewerProps),
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
    ComsatService.openPortOnRadomComsat,
    createSatellitePort,
    async.apply(ElementService.getNetworkElement, networkElementProps),
    async.apply(ElementInstanceService.createNetworkElementInstance, networkElementInstanceProps),
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingCLProps),
    async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps),
    createStreamViewer,
    async.apply(ElementInstanceService.createDebugConsole, debugConsoleElementInstanceProps),
    async.apply(ElementInstancePortService.createElementInstancePortByPortValue, debugConsoleProps),
    updateDebugConsole,
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
    ComsatService.openPortOnRadomComsat,
    createSatellitePort,
    async.apply(ElementService.getNetworkElement, networkElementProps),
    async.apply(ElementInstanceService.createNetworkElementInstance, debugElementInstanceProps),
    async.apply(NetworkPairingService.createNetworkPairing, debugNetworkPairingProps),
    createConsole,
    getFogInstanceDetails
  ], function(err, result) {

    AppUtils.sendResponse(res, err, 'instance', result.fogInstance, result);
  });
};

/*********** Integrator Instance Update EndPoint (Post: /api/v2/authoring/integrator/instance/update) *********/
const integratorInstanceUpdateEndPoint = function(req, res){
  logger.info("Endpoint hitted: "+ req.originalUrl);
  var params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },

      fogInstanceProps = {
        fogId: 'bodyParams.instanceId',
        setProperty: 'fogInstance'
      };
  
  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FogService.getFogInstance, fogInstanceProps),
    updateFogInstance

  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem updating Fog instance.' + result
    AppUtils.sendResponse(res, err, 'Updated Fog', params.bodyParams.instanceId, errMsg);
  });
};

/************************************* Extra Functions **************************************************/
const createSatellitePort = function(params, callback){
  var satellitePortProps = {
    satellitePortObj: {
      port1: params.comsatPort.port1,
      port2: params.comsatPort.port2,
      maxConnectionsPort1: 60,
      maxConnectionsPort2: 0,
      passcodePort1: params.comsatPort.passcode1,
      passcodePort2: params.comsatPort.passcode2,
      heartBeatAbsenceThresholdPort1: 60000,
      heartBeatAbsenceThresholdPort2: 0,
      satellite_id: params.satellite.id,
      mappingId: params.comsatPort.id
    },
    setProperty: 'satellitePort'
  };
    SatellitePortService.createSatellitePort(satellitePortProps, params, callback);
}

const createStreamViewer = function(params, callback){
  var createStreamViewerProps = {
      streamViewerObj : {
        version: 1,
        apiBaseUrl: 'https://' + params.satellite.domain + ':' + params.satellitePort.port2,
        accessToken: JSON.parse(params.streamViewer.config).accesstoken,
        element_id: params.streamViewer.uuid,
        iofog_uuid: params.fogInstance.uuid
      }
    };

  StreamViewerService.createStreamViewer(createStreamViewerProps, params, callback);
}

const updateDebugConsole = function(params, callback){
  var debugConsoleProps = {
      elementId: 'debugConsole.uuid',
      updatedData: {
        updatedBy: params.user.id,
      }
  };
  ElementInstanceService.updateElemInstance(debugConsoleProps, params, callback);
}

const createConsole = function(params, callback){
  var createConsoleProps = {
      consoleObj : {
        version: 1,
        apiBaseUrl: 'https://' + params.satellite.domain + ':' + params.satellitePort.port2,
        accessToken: JSON.parse(params.debugConsole.config).accesstoken,
        elementId: params.debugConsole.uuid,
        iofog_uuid: params.fogInstance.uuid
      }
    };
  ConsoleService.createConsole(createConsoleProps, params, callback)
}

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
  FogService.updateFogInstance(fogInstanceProps, params, callback);
}

const getFogInstanceDetails = function(params, callback) {
  var fogInstance = params.fogInstance.dataValues;

  fogInstance.typeName = params.fogType.name;
  fogInstance.typeDescription = params.fogType.description;
  fogInstance.typeImage = params.fogType.image;

  callback(null, {
    fogInstance: fogInstance
  });
}

export default {
  integratorInstanceCreateEndPoint: integratorInstanceCreateEndPoint,
  integratorInstanceUpdateEndPoint: integratorInstanceUpdateEndPoint
};