/**
 * @file elementController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the end-points that deal with elements
 */

import async from 'async';
import ChangeTrackingService from '../../services/changeTrackingService';
import ComsatService from '../../services/comsatService';
import DataTracksService from '../../services/dataTracksService';
import ElementService from '../../services/elementService';
import ElementInstanceService from '../../services/elementInstanceService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ElementInstanceConnectionsService from '../../services/elementInstanceConnectionsService';
import ElementAdvertisedPortService from '../../services/elementAdvertisedPortService';
import FogService from '../../services/fogService';
import FogTypeService from '../../services/fogTypeService';
import NetworkPairingService from '../../services/networkPairingService';
import RoutingService from '../../services/routingService';
import SatellitePortService from '../../services/satellitePortService';
import SatelliteService from '../../services/satelliteService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';
import _ from 'underscore';
import ArchitectureUtils from '../../utils/architectureUtils'

/*********************************************** EndPoints ******************************************************/
/***** Get Rebuild Status of Element Instance EndPoint (Get: /api/v2/authoring/element/instance/rebuild/status/elementid/:elementId *****/
 const elementInstanceRebuildStatusEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    elementInstanceProps = {
      elementInstanceId: 'bodyParams.elementId',
      setProperty: 'elementInstance'
    };

  params.bodyParams = req.params;
  params.bodyParams.t = req.query.t; 
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceService.getElementInstance, elementInstanceProps)

  ], function(err, result) {
    let rebuild = 0;
    if(!err){
      if (params.elementInstance.rebuild){
        rebuild = 1;
      }
    }
    AppUtils.sendResponse(res, err, 'rebuild', rebuild, result);
  });
};

/***** Track Element List By TrackId EndPoint (Get: /api/v2/authoring/fabric/track/element/list/:trackId) *****/
 const trackElementListEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
      userProps = {
          userId: 'bodyParams.t',
          setProperty: 'user'
      },
      elementInstanceProps = {
        trackId: 'bodyParams.trackId',
        setProperty: 'elementInstance'
      },
      elementAdvertisedProps = {
        elementInstanceData: 'elementInstance',
        field: 'element_key',
        setProperty: 'elementAdvertisedPort'
      },
      elementInstancePortProps = {
        elementInstanceData: 'elementInstance',
        field: 'uuid',
        setProperty: 'elementInstancePort'
      },
      networkPortProps = {
        elementInstancePortData: 'elementInstancePort',
        field: 'id',
        setProperty: 'networkPairing'
      },
      satellitePortProps = {
        networkData: 'networkPairing',
        field: 'satellitePortId',
        setProperty: 'satellitePort'
      },
      satelliteProps = {
        satellitePortData: 'satellitePort',
        field: 'satellite_id',
        setProperty: 'satellite'
      },
      routingProps = {
        elementInstanceData: 'elementInstance',
        field: 'uuid',
        setProperty: 'routing'
      },
      outputRoutingProps = {
        elementInstanceData: 'elementInstance',
        field: 'uuid',
        setProperty: 'outputRouting'
      },
      intraTrackProps = {
        intraTrackData: 'intraRoutingList',
        field: 'publishing_element_id',
        setProperty: 'intraTracks'
      },
      outputIntraTrackProps = {
        intraTrackData: 'outputIntraRoutingList',
        field: 'destination_element_id',
        setProperty: 'outputIntraTracks'
      },
      extraTrackProps = {
        extraTrackData: 'extraRoutingList',
        field: 'publishing_element_id',
        setProperty: 'extraTracks'
      },
      outputExtraTrackProps = {
        extraTrackData: 'outputExtraRoutingList',
        field: 'destination_element_id',
        setProperty: 'outPutExtraTracks'
      },
      otherTrackProps = {
        otherTrackData: 'otherTrackElementIds',
        field: 'elementId1',
        setProperty: 'extraintegrator'
      },
      outputOtherTrackProps = {
        otherTrackData: 'outputOtherTrackElementId2',
        field: 'elementId2',
        setProperty: 'outPutExtraintegrator'
      };

  params.bodyParams = req.params;
  params.bodyParams.t = req.query.t;

  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceService.findRealElementInstanceByTrackId, elementInstanceProps),
    async.apply(ElementAdvertisedPortService.findElementAdvertisedPortByElementIds, elementAdvertisedProps),
    async.apply(ElementInstancePortService.findElementInstancePortsByElementIds, elementInstancePortProps),
    async.apply(NetworkPairingService.findByElementInstancePortId, networkPortProps),
    async.apply(SatellitePortService.findBySatellitePortIds, satellitePortProps),
    async.apply(SatelliteService.findBySatelliteIds, satelliteProps),
    async.apply(RoutingService.findByElementInstanceUuidsAndRoutingDestination, routingProps),
    RoutingService.extractDifferentRoutingList,
    async.apply(ElementInstanceService.findIntraTrackByUuids, intraTrackProps),
    async.apply(ElementInstanceService.findExtraTrackByUuids, extraTrackProps),
    NetworkPairingService.findOtherTrackByUuids,
    NetworkPairingService.concatNetwotkElementAndNormalElement,
    async.apply(ElementInstanceService.findOtherTrackDetailByUuids, otherTrackProps),
    async.apply(RoutingService.findOutputRoutingByElementInstanceUuidsAndRoutingPublishing, outputRoutingProps),
    RoutingService.extractDifferentOutputRoutingList,
    async.apply(ElementInstanceService.findIntraTrackByUuids, outputIntraTrackProps),
    async.apply(ElementInstanceService.findExtraTrackByUuids, outputExtraTrackProps),
    NetworkPairingService.findOutputOtherElementInfoByUuids,
    NetworkPairingService.concatNetwotkElement2AndNormalElement,
    async.apply(ElementInstanceService.findOtherTrackDetailByUuids, outputOtherTrackProps),
    extractElementsForTrack
  ], function(err, result) {           
    AppUtils.sendResponse(res, err, 'elements', result.response, result);
  })
};

/******** Detailed Element Instance Create EndPoint (Post: /api/v2/authoring/element/instance/create) ************/
 const detailedElementInstanceCreateEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
    let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },
      elementProps = {
        networkElementId: 'bodyParams.elementKey',
        setProperty: 'element'
      },
      newElementInstanceProps = {
        userId: 'user.id',
        trackId: 'bodyParams.trackId',
        name: 'bodyParams.name',
        logSize: 'bodyParams.logSize',
        config: 'bodyParams.config',
        fogInstanceId: 'bodyParams.fabricInstanceId',
        setProperty: 'newElementInstance'
      },  
      changeTrackingProps = {
        fogInstanceId: 'bodyParams.fabricInstanceId',
        changeObject: {
          containerConfig: new Date().getTime(),
          containerList: new Date().getTime()
        }
      },
      elementAdvertisedProps = {
        elementInstanceData: 'elementInstance',
        field: 'element_key',
        setProperty: 'elementAdvertisedPort'
      },
      elementInstancePortProps = {
        elementInstanceData: 'elementInstance',
        field: 'uuid',
        setProperty: 'elementInstancePort'
      },
      fogProps = {
        fogId: 'bodyParams.fabricInstanceId',
        setProperty: 'fogInstance'
      },
      networkPortProps = {
        elementInstancePortData: 'elementInstancePort',
        field: 'id',
        setProperty: 'networkPairing'
      },
      satellitePortProps = {
        networkData: 'networkPairing',
        field: 'satellitePortId',
        setProperty: 'satellitePort'
      },
      satelliteProps = {
        satellitePortData: 'satellitePort',
        field: 'satellite_id',
        setProperty: 'satellite'
      },
      routingProps = {
        elementInstanceData: 'elementInstance',
        field: 'uuid',
        setProperty: 'routing'
      },
      outputRoutingProps = {
        elementInstanceData: 'elementInstance',
        field: 'uuid',
        setProperty: 'outputRouting'
      },
      intraTrackProps = {
        intraTrackData: 'intraRoutingList',
        field: 'publishing_element_id',
        setProperty: 'intraTracks'
      },
      outputIntraTrackProps = {
        intraTrackData: 'outputIntraRoutingList',
        field: 'destination_element_id',
        setProperty: 'outputIntraTracks'
      },
      extraTrackProps = {
        extraTrackData: 'extraRoutingList',
        field: 'publishing_element_id',
        setProperty: 'extraTracks'
      },
      outputExtraTrackProps = {
        extraTrackData: 'outputExtraRoutingList',
        field: 'destination_element_id',
        setProperty: 'outPutExtraTracks'
      },
      otherTrackProps = {
        otherTrackData: 'otherTrackElementIds',
        field: 'elementId1',
        setProperty: 'extraintegrator'
      },
      outputOtherTrackProps = {
        otherTrackData: 'outputOtherTrackElementId2',
        field: 'elementId2',
        setProperty: 'outPutExtraintegrator'
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getNetworkElement, elementProps),
    async.apply(FogService.getFogInstance, fogProps),
    async.apply(ElementInstanceService.createElementInstance, newElementInstanceProps),
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
    convertToArr,
    async.apply(ElementAdvertisedPortService.findElementAdvertisedPortByElementIds, elementAdvertisedProps),
    async.apply(ElementInstancePortService.findElementInstancePortsByElementIds, elementInstancePortProps),
    async.apply(NetworkPairingService.findByElementInstancePortId, networkPortProps),
    async.apply(SatellitePortService.findBySatellitePortIds, satellitePortProps),
    async.apply(SatelliteService.findBySatelliteIds, satelliteProps),
    async.apply(RoutingService.findByElementInstanceUuidsAndRoutingDestination, routingProps),
    RoutingService.extractDifferentRoutingList,
    async.apply(ElementInstanceService.findIntraTrackByUuids,intraTrackProps),
    async.apply(ElementInstanceService.findExtraTrackByUuids,extraTrackProps),
    NetworkPairingService.findOtherTrackByUuids,
    NetworkPairingService.concatNetwotkElementAndNormalElement,
    async.apply(ElementInstanceService.findOtherTrackDetailByUuids, otherTrackProps),
    async.apply(RoutingService.findOutputRoutingByElementInstanceUuidsAndRoutingPublishing, outputRoutingProps),
    RoutingService.extractDifferentOutputRoutingList,
    async.apply(ElementInstanceService.findIntraTrackByUuids, outputIntraTrackProps),
    async.apply(ElementInstanceService.findExtraTrackByUuids, outputExtraTrackProps),
    NetworkPairingService.findOutputOtherElementInfoByUuids,
    NetworkPairingService.concatNetwotkElement2AndNormalElement,
    async.apply(ElementInstanceService.findOtherTrackDetailByUuids, outputOtherTrackProps),
    getElementDetails

  ], function(err, result) {
      let errMsg = 'Internal error: ' + result;
    AppUtils.sendResponse(res, err, 'elementDetails', params.elementInstanceDetails, errMsg);
  });
};

/********** Element Instance Create EndPoint (Post: /api/v2/authoring/build/element/instance/create) **********/
const elementInstanceCreateEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {};
  params.logSize = 10;
  
  let userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
      
    elementProps = {
      networkElementId: 'bodyParams.elementKey',
      setProperty: 'element'
    },

    elementInstanceProps = {
      userId: 'user.id',
      trackId: 'bodyParams.trackId',
      name: 'bodyParams.name',
      logSize: 'logSize',
      setProperty: 'elementInstance'
    },
    trackProps = {
      trackId: 'bodyParams.trackId',
      setProperty: 'trackData'
    };
  
  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getNetworkElement, elementProps),
    async.apply(DataTracksService.getDataTrackById, trackProps),
    async.apply(ElementInstanceService.createElementInstance, elementInstanceProps),
    processNewElementInstance

  ], function(err, result) {
    let errMsg = 'Internal error: There was a problem creating the ioElement instance.' + result;
    AppUtils.sendResponse(res, err, 'elementInstance', params.outputObj, errMsg);
  });
};

const processNewElementInstance = function(params, callback) {
  let outputObj = {
    id: params.elementInstance.uuid,
    layoutX: params.bodyParams.layoutX,
    layoutY: params.bodyParams.layoutY
  };

  params.outputObj = outputObj;
  callback(null, params);
};

/*** Element Instance Name/Config Update EndPoint (Post: ['/api/v2/authoring/element/instance/config/update',
                                                          '/api/v2/authoring/element/instance/name/update',]) ***/
const elementInstanceConfigUpdateEndPoint = function(req, res) {
logger.info("Endpoint hit: "+req.originalUrl);

  let params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    elementInstanceProps = {
      elementInstanceId: 'bodyParams.elementId',
      setProperty: 'elementInstance'
    },

    changeTrackingProps = {
      instanceId: 'elementInstance.iofog_uuid',
      setProperty: 'trackingData'
    };
  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
    updateElementInstanceConfig,
    async.apply(ChangeTrackingService.getChangeTrackingByInstanceId, changeTrackingProps),
    updateConfigTracking

  ], function(err, result) {
      let errMsg = 'Internal error: There was a problem updating ioElement instance.' + result;

    AppUtils.sendResponse(res, err, 'elementInstance', params.bodyParams.elementId, errMsg);
  });
};

/********* Element Instance Delete EndPoint (Post: '/api/v2/authoring/element/instance/delete') *********/
const elementInstanceDeleteEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

    let params = {},

        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },

        portPasscodeProps = {
            elementId: 'bodyParams.elementId',
            setProperty: 'portPasscode'
        },

        deleteElementProps = {
            elementId: 'bodyParams.elementId',
            iofogUUID: 'elementInstance.iofog_uuid',
            withCleanUp: 'bodyParams.withCleanUp'
        },

        elementInstanceProps = {
            setProperty: 'elementInstance',
            elementInstanceId: 'bodyParams.elementId'
        },

        fogProps = {
            setProperty: 'fog',
            fogId: 'elementInstance.iofog_uuid'
        },

        changeTrackingProps = {
            fogInstanceId: 'elementInstance.iofog_uuid',
            changeObject: {
                'containerList': new Date().getTime(),
            }
        };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));
  params.milliseconds = new Date().getTime();

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstancePortService.deleteElementInstancePort, deleteElementProps),
    async.apply(RoutingService.deleteElementInstanceRouting, deleteElementProps),
    async.apply(RoutingService.deleteNetworkElementRouting, deleteElementProps),
    async.apply(ElementInstanceService.deleteNetworkElementInstance, deleteElementProps),
    async.apply(SatellitePortService.getPasscodeForNetworkElements, portPasscodeProps),
    ComsatService.closePortsOnComsat,
    async.apply(NetworkPairingService.deleteNetworkPairing, deleteElementProps),
    async.apply(SatellitePortService.deletePortsForNetworkElements, deleteElementProps),
    async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
      async.apply(FogService.getFogInstanceOptional, fogProps),
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
      async.apply(ElementInstanceService.deleteElementInstanceWithCleanUp, deleteElementProps)
  ], function(err, result) {
    let errMsg = 'Internal error: There was a problem deleting ioElement instance.' + result;

    AppUtils.sendResponse(res, err, 'element', params.bodyParams.elementId, errMsg);
  });
};

/** Element Instance Comsat Pipe Create EndPoint (Post: '/api/v2/authoring/element/instance/comsat/pipe/create') **/
const elementInstanceComsatPipeCreateEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    fogTypeProps = {
      fogTypeId: 'fogInstance.typeKey',
      setProperty: 'fogType'
    },

    elementInstanceProps = {
      elementInstanceId: 'bodyParams.elementId',
      setProperty: 'elementInstance'
    },

    elementInstancePortProps = {
      portId: 'bodyParams.portId',
      setProperty: 'elementInstancePort'
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

    changeTrackingCLProps = {
      fogInstanceId: 'fogInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime()
      }
    },

    fogProps = {
      fogId: 'bodyParams.instanceId',
      setProperty: 'fogInstance'
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
      passcode: 'comsatPort.passcode1',
      trackId: null,
      userId: 'user.id',
      networkName: null,
      networkPort: 0,
      isPublic: true,
      setProperty: 'networkElementInstance'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));
  // elementId is used as params.streamViewer.uuid in NetworkPairingService->createNetworkPairing method
  params.streamViewer = {};
  params.streamViewer.uuid = params.bodyParams.elementId;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FogService.getFogInstance, fogProps),
    async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
    async.apply(FogTypeService.getFogTypeDetail, fogTypeProps),
    async.apply(ElementInstancePortService.getElementInstancePort, elementInstancePortProps),
    ComsatService.openPortOnRadomComsat,
    createSatellitePort,
    async.apply(ElementService.getNetworkElement, networkElementProps),
    createNetworkElementInstance,
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingCLProps),
    async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps)
  ], function(err, result) {
    let errMsg = 'Internal error: There was a problem trying to create the Comsat Pipe.' + result;
    let outputObj;
     if (params.satellite){
      outputObj = {
        'accessUrl': 'https://' + params.satellite.domain + ':' + params.satellitePort.port2,
        'networkPairingId': params.networkPairingObj.id
      };
    }
    AppUtils.sendResponse(res, err, 'connection', outputObj, errMsg);
  });
};

/** Element Instance Comsat Pipe Delete EndPoint (Post: '/api/v2/authoring/element/instance/comsat/pipe/delete') **/
const elementInstanceComsatPipeDeleteEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    changeTrackingProps = {
      fogInstanceId: 'networkPairing.instanceId1',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime()
      }
    },

    satellitePortProps = {
      satellitePortId: 'networkPairing.satellitePortId',
      setProperty: 'satellitePort'
    },

    satelliteProps = {
      satelliteId: 'satellitePort.satellite_id',
      setProperty: 'satellite'
    },

    deleteSatelliteProps = {
      satellitePortId: 'satellitePort.id'
    },

    networkPairingProps = {
      networkPairingId: 'networkPairing.id'
    },

    deleteElementInstanceProps = {
      elementId: 'networkPairing.networkElementId1'
    },
    getNetworkPairingProps = {
      networkPairingId: 'bodyParams.networkPairingId'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(NetworkPairingService.getNetworkPairing, getNetworkPairingProps),
    async.apply(SatellitePortService.getSatellitePort, satellitePortProps),
    async.apply(SatelliteService.getSatelliteById, satelliteProps),
    ComsatService.closePortOnComsat,
    async.apply(SatellitePortService.deleteSatellitePort, deleteSatelliteProps),
    async.apply(ElementInstanceService.deleteElementInstance, deleteElementInstanceProps),
    async.apply(NetworkPairingService.deleteNetworkPairingById, networkPairingProps),
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps)

  ], function(err, result) {
    let errMsg = 'Internal error: There was a problem trying to delete the Comsat Pipe.' + result;

    AppUtils.sendResponse(res, err, 'networkPairingId', params.bodyParams.networkPairingId, errMsg);
  });
};

/**** Element Instance Port Create EndPoint (Post: '/api/v2/authoring/element/instance/port/create') ****/
const elementInstancePortCreateEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
    waterfallMethods = [],

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    elementInstancePortProps = {
      userId: 'user.id',
      internalPort: 'bodyParams.internalPort',
      externalPort: 'bodyParams.externalPort',
      elementId: 'bodyParams.elementId',
      setProperty: 'elementInstancePort'
    },

    elementInstanceProps = {
      elementInstanceId: 'bodyParams.elementId',
      setProperty: 'elementInstance'
    },

    elementInstancesProps = {
      fogId: 'fogInstance.uuid',
      setProperty: 'elementInstances'
    },

    fogProps = {
      fogId: 'elementInstance.iofog_uuid',
      setProperty: 'fogInstance'
    },

    changeTrackingProps = {
      fogInstanceId: 'fogInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime()
      }
    },

    fogTypeProps = {
      fogTypeId: 'fogInstance.typeKey',
      setProperty: 'fogType'
    },

    networkPairingProps = {
      instanceId1: 'fogInstance.uuid',
      instanceId2: null,
      elementId1: 'bodyParams.elementId',
      elementId2: null,
      networkElementId1: 'networkElementInstance.uuid',
      networkElementId2: null,
      isPublic: true,
      elementPortId: 'elementInstancePort.id',
      satellitePortId: 'satellitePort.id',
      setProperty: 'networkPairingObj'
    },

    changeTrackingCLProps = {
      fogInstanceId: 'fogInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime()
      }
    },

    networkElementProps = {
      networkElementId: 'fogType.networkElementKey',
      setProperty: 'networkElement'
    },
    elementInstancesPortProps = {
      elementInstanceData: 'elementInstances',
      field: 'uuid',
      setProperty: 'elemntInstancesPortData'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  if (params.bodyParams.publicAccess == 1) {
    waterfallMethods = [
      async.apply(UserService.getUser, userProps, params),
      async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
      async.apply(FogService.getFogInstance, fogProps),
      async.apply(FogTypeService.getFogTypeDetail, fogTypeProps),

      async.apply(ElementInstanceService.getElementInstancesByFogId, elementInstancesProps),
      async.apply(ElementInstancePortService.findElementInstancePortsByElementIds, elementInstancesPortProps),
      verifyPorts,
      
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
      async.apply(ElementInstancePortService.createElementInstancePort, elementInstancePortProps),
      updateElemInstance,
      ComsatService.openPortOnRadomComsat,
      createSatellitePort,
      async.apply(ElementService.getNetworkElement, networkElementProps),
      createNetworkElementInstance,
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingCLProps),
      async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps),
      getOutputDetails
    ];
  } else {
    waterfallMethods = [
      async.apply(UserService.getUser, userProps, params),
      async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
      async.apply(FogService.getFogInstance, fogProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
      async.apply(ElementInstancePortService.createElementInstancePort, elementInstancePortProps),
      updateElemInstance,
      getOutputDetails
    ];
  }
  async.waterfall(waterfallMethods, function(err, result) {

    AppUtils.sendResponse(res, err, 'port', params.output, result);
  });
};

const verifyPorts = function(params, callback){
  let internalPort = params.bodyParams.internalPort,
    externalPort = params.bodyParams.externalPort;

  if(AppUtils.isValidPort(internalPort)){
    if(AppUtils.isValidPort(externalPort)){
      if(externalPort != 60400 && externalPort != 60401 && externalPort != 10500 && externalPort != 54321 && externalPort != 55555){
        if(params.elemntInstancesPortData.length){
          async.each(params.elemntInstancesPortData, function(obj, next) {
            if(externalPort == obj.portexternal){
              next('Error', 'Port is already in use.')
            }else{
              next();
            }
          }, function(err) {
            if(!err){
              callback(null, params)
            }else{
              callback('Error', 'Port '+ externalPort +' is already in use on this fog instance!');
            }
          });
        }else{
          callback(null, params);
        }
      }else{
        callback('Error', 'Port '+ externalPort +' is already in use on this fog instance!');
      }
    }else{
      callback('Error', 'You must enter a valid number for both the internal and external ports');
    }
  }else{
    callback('Error', 'You must enter a valid number for both the internal and external ports');
  }
};

const createNetworkElementInstance = function (params, callback){
  let networkElementInstanceProps = {
      networkElement: 'networkElement',
      fogInstanceId: 'fogInstance.uuid',
      satellitePort: 'satellitePort.port1',
      satelliteDomain: 'satellite.domain',
      satelliteCertificate: 'satellite.cert',
      trackId: 'bodyParams.trackId',
      userId: 'user.id',
      networkName: 'Network for Element '+ params.elementInstance.uuid,
      networkPort: 'bodyParams.externalPort',
      isPublic: true,
      passcode: 'comsatPort.passcode1',
      setProperty: 'networkElementInstance'
    };

  ElementInstanceService.createNetworkElementInstance(networkElementInstanceProps, params, callback);
};

/**** Element Instance Port Delete EndPoint (Post: '/api/v2/authoring/element/instance/port/delete') ****/
const elementInstancePortDeleteEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
    waterfallMethods = [],

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    elementInstancePortProps = {
      portId: 'bodyParams.portId',
      setProperty: 'elementInstancePort'
    },

    readElementInstanceProps = {
      elementInstanceId: 'elementInstancePort.elementId',
      setProperty: 'elementInstance'
    },

    fogProps = {
      fogId: 'elementInstance.iofog_uuid',
      setProperty: 'fogInstance'
    },

    changeTrackingProps = {
      fogInstanceId: 'fogInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime()
      }
    },

    delElementInstancePortProps = {
      elementPortId: 'elementInstancePort.id'
    },

    satellitePortProps = {
      satellitePortId: 'networkPairing.satellitePortId',
      setProperty: 'satellitePort'
    },

    satelliteProps = {
      satelliteId: 'satellitePort.satellite_id',
      setProperty: 'satellite'
    },

    deleteSatelliteProps = {
      satellitePortId: 'satellitePort.id'
    },

    networkPairingProps = {
      networkPairingId: 'networkPairing.id'
    },

    changeTrackingProps2 = {
      fogInstanceId: 'networkPairing.instanceId1',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime()
      }
    },
    deleteElementInstanceProps = {
      elementId: 'networkPairing.networkElementId1'
    },
    getNetworkPairingProps = {
      networkPairingId: 'bodyParams.networkPairingId'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  if (params.bodyParams.networkPairingId > 0) {
    waterfallMethods = [
      async.apply(UserService.getUser, userProps, params),
      async.apply(ElementInstancePortService.getElementInstancePort, elementInstancePortProps),
      updateElemInstance,
      async.apply(ElementInstanceService.getElementInstance, readElementInstanceProps),
      async.apply(FogService.getFogInstance, fogProps),
      async.apply(NetworkPairingService.getNetworkPairing, getNetworkPairingProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
      async.apply(ElementInstancePortService.deleteElementInstancePortById, delElementInstancePortProps),
      async.apply(SatellitePortService.getSatellitePort, satellitePortProps),
      async.apply(SatelliteService.getSatelliteById, satelliteProps),
      ComsatService.closePortOnComsat,
      async.apply(SatellitePortService.deleteSatellitePort, deleteSatelliteProps),
      async.apply(ElementInstanceService.deleteElementInstance, deleteElementInstanceProps),
      async.apply(NetworkPairingService.deleteNetworkPairingById, networkPairingProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps2)
    ];
  } else {
    waterfallMethods = [
      async.apply(UserService.getUser, userProps, params),
      async.apply(ElementInstancePortService.getElementInstancePort, elementInstancePortProps),
      updateElemInstance,
      async.apply(ElementInstanceService.getElementInstance, readElementInstanceProps),
      async.apply(FogService.getFogInstance, fogProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
      async.apply(ElementInstancePortService.deleteElementInstancePortById, delElementInstancePortProps)
    ];
  }

  async.waterfall(waterfallMethods, function(err, result) {
    AppUtils.sendResponse(res, err, 'portId', params.bodyParams.portId, result);
  });
};

/***** Get Properties of Element Instance EndPoint (Post: api/v2/authoring/build/properties/panel/get *****/
 const getElementInstancePropertiesEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },
      elementInstanceProps = {
        elementInstanceId: 'bodyParams.instanceId',
        setProperty: 'elementInstance'
      },
      elementInstancePortProps = {
        elementInstanceData: 'elementInstance',
        field: 'uuid',
        setProperty:'elementInstancePort'
      },
      networkPairingProps = {
        elementInstancePortData: 'elementInstancePort',
        field: 'id',
        setProperty:'networkPairing'
      },
      satellitePortProps = {
        networkData: 'networkPairing',
        field: 'satellitePortId',
        setProperty: 'satellitePort'
      },
      satelliteProps = {
        satellitePortData: 'satellitePort',
        field: 'satellite_id',
        setProperty: 'satellite'
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceService.getElementInstanceProperties, elementInstanceProps),
    async.apply(ElementInstancePortService.findElementInstancePortsByElementIds, elementInstancePortProps),
    async.apply(NetworkPairingService.findByElementInstancePortId, networkPairingProps),
    async.apply(SatellitePortService.findBySatellitePortIds, satellitePortProps),
    async.apply(SatelliteService.findBySatelliteIds, satelliteProps),
    getElementInstanceProperties

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'instance', params.response, result);
  });
};

/***** Create Element Instance Connection EndPoint (Post: /api/v2/authoring/element/connection/create *****/
 const createElementInstanceConnectionEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },
      elementInstanceConnectionProps = {
        sourceElementInstanceId: 'bodyParams.sourceElementId',
        destinationElementInstanceId: 'bodyParams.destinationElementId',
        setProperty: 'elementInstanceConnection'
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceConnectionsService.findBySourceAndDestinationElementInstance, elementInstanceConnectionProps),
    createElementInstanceConnection

  ], function(err, result) {
    let connectionId;
    if(!err){
      if (params.elementInstanceConnection.length){
        connectionId =  params.elementInstanceConnection[0].id;
      }else{
        connectionId = params.newElementInstanceConnection.id;
      }
    }
    AppUtils.sendResponse(res, err, 'connection', connectionId, result);
  });
};

/***** Delete Element Instance Connection EndPoint (Post: /api/v2/authoring/element/connection/delete *****/
 const deleteElementInstanceConnectionEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },
      elementInstanceConnectionProps = {
        sourceElementInstanceId: 'bodyParams.sourceElementId',
        destinationElementInstanceId: 'bodyParams.destinationElementId',
        setProperty: 'elementInstanceConnection'
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceConnectionsService.deleteBySourceAndDestinationElementInstance, elementInstanceConnectionProps),

  ], function(err, result) {

    AppUtils.sendResponse(res, err, '', '', result);
  });
};

/********** Element Instance Update EndPoint (Post: /api/v2/authoring/element/instance/update) **********/
const elementInstanceUpdateEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },
      elementInstanceProps = {
        elementInstanceId: 'bodyParams.instanceId',
        setProperty: 'elementInstance'
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
      async.apply(UserService.getUser, userProps, params),
      getFogInstance,
      async.apply(ElementInstanceService.getElementInstanceWithImages, elementInstanceProps),
      updateElementInstance,
      updateChangeTracking,
      updateChange, 
      updateElement 
    ], function(err, result) {
    AppUtils.sendResponse(res, err, 'id', params.bodyParams.instanceId, result);
    });
};

const getFogInstance = function (params, callback){
    if (params.bodyParams.fabricInstanceId && params.bodyParams.fabricInstanceId !== "NONE") {
    let fogProps = {
      fogId: 'bodyParams.fabricInstanceId',
      setProperty: 'fogData'
    };
    
    FogService.getFogInstance(fogProps, params, callback);
  }else{
    callback(null, params);
  }
};

/***** Update Rebuild of Element Instance EndPoint (Post: /api/v2/authoring/element/instance/rebuild *****/
 const elementInstanceRebuildUpdateEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },
      elementInstanceProps = {
        elementInstanceId: 'bodyParams.elementId',
        setProperty: 'elementInstance'
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
    updateRebuild,
    updateChangeTrackingData

  ], function(err, result) {

    AppUtils.sendResponse(res, err, 'id', params.bodyParams.elementId, result);
  });
};

/***** Get Details of Element Instance EndPoint (Get/Post: /api/v2/authoring/element/instance/details/trackid/:trackId *****/
 const getElementInstanceDetailsEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },
      elementInstanceProps = {
        trackId: 'bodyParams.trackId',
        setProperty: 'elementInstance'
      },
      elementInstanceConnectionProps = {
        sourceElementInstanceIds: 'elementInstance',
        field: 'uuid',
        setProperty:'elementInstanceConnection'
      },
      elementInstancePortProps = {
        elementInstanceData: 'elementInstance',
        field: 'uuid',
        setProperty:'elementInstancePort'
      },
      networkPairingProps = {
        elementInstancePortData: 'elementInstancePort',
        field: 'id',
        setProperty:'networkPairing'
      },
      satellitePortProps = {
        networkData: 'networkPairing',
        field: 'satellitePortId',
        setProperty: 'satellitePort'
      },
      satelliteProps = {
        satellitePortData: 'satellitePort',
        field: 'satellite_id',
        setProperty: 'satellite'
      },
      debugProps = {
        elementInstanceData: 'elementInstance',
        fieldOne: 'uuid',
        fieldTwo: 'fogInstanceId',
        setProperty: 'isDebug'
      },
      viewerProps = {
        elementInstanceData: 'elementInstance',
        fieldOne: 'uuid',
        fieldTwo: 'fogInstanceId',
        setProperty: 'isViewer'
      },
      dataTrackProps = {
        elementInstanceData: 'elementInstance',
        field: 'uuid',
        setProperty: 'dataTracks'
      };
  
  params.bodyParams = req.body;

  if(req.query.t){
      params.bodyParams.t = req.query.t;
  }
  params.bodyParams.trackId = req.params.trackId;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceService.getDetailedElementInstances, elementInstanceProps),
    async.apply(ElementInstanceConnectionsService.findBySourceElementInstance, elementInstanceConnectionProps),
    async.apply(ElementInstancePortService.findElementInstancePortsByElementIds, elementInstancePortProps),
    async.apply(NetworkPairingService.findByElementInstancePortId, networkPairingProps),
    async.apply(SatellitePortService.findBySatellitePortIds, satellitePortProps),
    async.apply(SatelliteService.findBySatelliteIds, satelliteProps),
    async.apply(RoutingService.isDebugging, debugProps),
    async.apply(RoutingService.isViewer, viewerProps),
    async.apply(ElementInstanceService.getDataTrackDetails, dataTrackProps),
    getElementInstanceDetails

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'instance', params.response, result);
  });
};

/********************************* Extra Functions *****************************************/
const getElementInstanceDetails = function(params, callback){
  try{
    let response = [];
    async.eachSeries(params.elementInstance, function(instance, cb){
      let elementInstance = {
        id: instance.uuid,
        elementInstanceName: instance.elementInstanceName,
        config: instance.config,
        fogInstanceId: instance.fogInstanceId != null ? instance.fogInstanceId :'NONE',
        rootHostAccess: instance.rootHostAccess,
        strace: instance.strace,
        logSize: instance.logSize,
        viewerEnabled: instance.isStreamViewer,
        debugEnabled: instance.isDebugConsole,
        volumeMappings: instance.volumeMappings,
        elementName: instance.elementName,
        picture: instance.elementPicture,
        images: instance.elementImages,
        connections: getConnections(params, instance),
        ports: extractOpenPort(params, instance),
        debug: isDebugging(params, instance),
        viewer: isViewer(params, instance),
        status: instance.daemonStatus == null ? 'UNKNOWN': instance.daemonStatus
      };
      response.push(elementInstance);
      cb();
    },
    function(err) {
      params.response = response;
      callback(null, params);
    });
  }catch(e){
    logger.error(e);
  }
};

const isViewer = function(params, elementInstance) {
   let elementInstanceViewer = _.where(params.isViewer, {
    publishing_element_id: elementInstance.uuid
  });

  if(elementInstanceViewer.length > 0){
    return 1;
  }else{
    return 0;
  }
};

const getConnections = function(params, elementInstance) {
  let connections = [];

  let elementInstanceConnection = _.where(params.elementInstanceConnection, {
    sourceElementInstance: elementInstance.uuid
  });

  elementInstanceConnection.forEach((instanceConnection, index) => {
    connections.push(instanceConnection.destinationElementInstance);
  });
  return connections;
};

const updateChangeTrackingData = function(params, callback) {
  if (params.elementInstance.iofog_uuid){
    let changeTrackingProps = {
      fogInstanceId: 'elementInstance.iofog_uuid',
      changeObject: {
        containerList: new Date().getTime()
      }
    };
    
    ChangeTrackingService.updateChangeTracking(changeTrackingProps, params, callback);
  }else{
    callback(null, params);
  }
};

const updateRebuild = function (params, callback) {
  params.elementInstanceName = 'Network for Element ' + params.bodyParams.elementId;
  let elementProps = {
      elementId: 'bodyParams.elementId',
      name: 'elementInstanceName',
      updatedData: {
        rebuild: 1
      }
    };

  ElementInstanceService.updateElementInstanceRebuild(elementProps, params, callback);
};

const updateElementInstance = function (params, callback) {
  try{
  let data;

  if (params.elementInstance.iofog_uuid == params.bodyParams.fabricInstanceId) {
    callback(null, params);
  } 
  else {
    let fogInstanceId = null;
      if (params.bodyParams.fabricInstanceId !== 'NONE') {
        fogInstanceId = params.bodyParams.fabricInstanceId;
      }

      if (params.fogData !== undefined && !ArchitectureUtils
            .isExistsImageForFogType(params.fogData.typeKey, params.elementInstance.elementImages)) {

      callback('error', "no container image for this fog type");
      return;
    }

    data = {
      iofog_uuid: fogInstanceId
    };

    let elementProps = {
      elementId:'bodyParams.instanceId',
      updatedData: data
    };
    ElementInstanceService.updateElemInstance(elementProps, params, callback);
  }
  }catch(e){
    logger.error(e);
  }
};

const updateChangeTracking = function(params, callback) {

  let lastUpdated = new Date().getTime(),
    updateChangeTracking = {},
    updateChange = {},

    updateElementObject = {
      logSize: params.bodyParams.logSize,
      name: params.bodyParams.name,
      config: params.bodyParams.config,
      configLastUpdated: lastUpdated,
      rootHostAccess: params.bodyParams.rootAccess,
      volumeMappings: params.bodyParams.volumes
    };

  if (params.elementInstance.config != params.bodyParams.config) {
    updateElementObject.configLastUpdated = new Date().getTime();
    updateChangeTracking.containerConfig = new Date().getTime();
  }
  if (params.elementInstance.iofog_uuid != params.bodyParams.fabricInstanceId) {

    updateChangeTracking.containerList = new Date().getTime();
    updateChangeTracking.containerConfig = new Date().getTime();

    updateChange.containerConfig = new Date().getTime();
    updateChange.containerList = new Date().getTime();

  } else if (params.elementInstance.rootHostAccess != params.bodyParams.rootAccess ||
             params.elementInstance.volumeMappings != params.bodyParams.volumes) {
    updateChange.containerList = new Date().getTime();
  }

  params.updateElementObject = updateElementObject;
  params.updateChange = updateChange;

  if (updateChangeTracking.containerConfig || updateChangeTracking.containerList){
    let changeTrackingProps = {
      fogInstanceId: 'elementInstance.iofog_uuid',
      changeObject: updateChangeTracking
    };
    
    ChangeTrackingService.updateChangeTracking(changeTrackingProps, params, callback);
  }else{
    callback(null, params);
  }
};

const updateChange = function(params, callback) {
  if (params.updateChange.containerConfig || params.updateChange.containerList){
    let changeTrackingProps = {
      fogInstanceId: 'bodyParams.fabricInstanceId',
      changeObject: params.updateChange
    };
    
    ChangeTrackingService.updateChangeTracking(changeTrackingProps, params, callback);
  }else{
    callback(null, params);
  }
};

const updateElement = function(params, callback) {

  let elementInstanceProps = {
    elementId: 'bodyParams.instanceId',
    updatedData: params.updateElementObject
  };
  ElementInstanceService.updateElemInstance(elementInstanceProps, params, callback);
};

const createElementInstanceConnection = function(params, callback) {
  if (params.bodyParams.sourceElementId && params.bodyParams.destinationElementId){
    if (params.elementInstanceConnection == ''){
      let newElementInstanceConnectionProps = {
        newConnectionObj: {
          sourceElementInstance: params.bodyParams.sourceElementId,
          destinationElementInstance: params.bodyParams.destinationElementId
        },
        setProperty: 'newElementInstanceConnection'
      };

      ElementInstanceConnectionsService.createElementInstanceConnection(newElementInstanceConnectionProps, params, callback);
    }else{
      callback(null, params);
    }
  }else{
    callback('err', 'sourceElementId and destinationElementId cannot be empty');
  }
};

const getElementInstanceProperties = function(params, callback) {
  let response = [];
  params.elementInstance.forEach((instance, index) => {

    if (instance.elementKey) {
      let elementInstance = {
        id: instance.uuid,
        elementKey: instance.elementKey,
        config: instance.elementInstanceConfig,
        elementInstanceName: instance.elementInstanceName,
        fogInstanceId: instance.fogInstanceId != null ? instance.fogInstanceId :'NONE',
        rebuild: instance.rebuild,
        rootHostAccess: instance.rootHostAccess,
        strace: instance.strace,
        logSize: instance.logSize,
        elementName: instance.name,
        description: instance.description,
        category: instance.category,
        images: instance.elementImages,
        registryId: instance.registry,
        publisher: instance.publisher,
        diskRequired: instance.diskRequired,
        ramRequired: instance.ram_required,
        picture: instance.picture,
        volumeMappings: instance.volumeMappings,
        isPublic: instance.is_public,
        ports: extractOpenPort(params, instance)
      };
      response.push(elementInstance);
    }
  });
  params.response = response;
  callback(null, params);
};

const isDebugging = function(params, elementInstance) {
   let elementInstanceDebug = _.where(params.isDebug, {
    publishing_element_id: elementInstance.uuid
  });

  if(elementInstanceDebug.length > 0){
    return 1;
  }else{
    return 0;
  }
};

const extractOpenPort = function(params, elementInstance) {
  let openports = [];
  let elementInstancePort = _.where(params.elementInstancePort, {
    elementId: elementInstance.uuid
  });
  elementInstancePort.forEach((instancePort, index) => {
    let networkpairing = _.findWhere(params.networkPairing, {
      elemen1PortId: instancePort.id
    });
    let accessurl, networkpairingid;

    if (networkpairing != null) {

      let satellitePort = _.findWhere(params.satellitePort, {
        id: networkpairing.satellitePortId
      });

      let satellite = _.findWhere(params.satellite, {
        id: satellitePort.satellite_id
      });

      accessurl = 'https://' + satellite.domain + ':' + satellitePort.port2;
      networkpairingid = networkpairing.id;
    } else {
      accessurl = '';
      networkpairingid = 0;
    }

    let openPort = {
      portId: instancePort.id,
      internalPort: instancePort.portinternal,
      externalPort: instancePort.portexternal,
      accessUrl: accessurl,
      networkPairingId: networkpairingid
    }

    openports.push(openPort);
  });

  return openports;
}

const extractElementsForTrack = function(params, callback) {
  let response = [];
  params.elementInstance.forEach((instance, index) => {

    if (instance.element_key) {
      let elementInstance = {
        elementid: instance.uuid,
        elementkey: instance.element_key,
        config: instance.config,
        name: instance.name,
        elementtypename: instance.element.name,
        category: instance.element.category,
        image: instance.element.containerImage,
        registryId: instance.element.registry,
        publisher: instance.element.publisher,
        advertisedports: _.where(params.elementAdvertisedPort, {
          element_id: instance.element_key
        }),
        openports: extractOpenPort(params, instance),
        routing: extractRouting(params, instance)
      };
      response.push(elementInstance);
    }
  });
  params.response = response;
  callback(null, params);
}

const extractRouting = function(params, elementInstance) {

  let inputs, outputs;

  let inputIntraTrack = _.where(params.intraTracks, {
    elementid: elementInstance.uuid
  });
  let inputExtraTrack = _.where(params.extraTracks, {
    elementid: elementInstance.uuid
  });
  let inputExtraIntegrator = _.where(params.extraintegrator, {
    elementid: elementInstance.uuid
  });

  let outputIntraTrack = _.where(params.outputIntraTracks, {
    elementid: elementInstance.uuid
  });
  let outputExtraTrack = _.where(params.outPutExtraTracks, {
    elementid: elementInstance.uuid
  });
  let outputExtraIntegrator = _.where(params.outPutExtraintegrator, {
    elementid: elementInstance.uuid
  });

  return {
    inputs: {
      intratrack: inputIntraTrack,
      extratrack: inputExtraTrack,
      extraintegrator: inputExtraIntegrator,
    },
    outputs: {
      intratrack: outputIntraTrack,
      extratrack: outputExtraTrack,
      extraintegrator: outputExtraIntegrator,
    }
  }
}

const convertToArr = function(params, callback) {
  let elementInstance = [];

  elementInstance.push(params.newElementInstance);
  params.elementInstance = elementInstance;

  callback(null, params);
}

const getElementDetails = function(params, callback) {
  let elementInstanceDetails = {
    elementId: params.elementInstance[0].uuid,
    elementKey: params.elementInstance[0].element_key,
    config: params.elementInstance[0].config,
    name: params.elementInstance[0].name,
    elementTypeName: params.element.name,
    category: params.element.category,
    image: params.element.containerImage,
    registryId: params.element.registry,
    publisher: params.element.publisher,
    advertisedPorts: _.where(params.elementAdvertisedPort, {
      element_id: params.elementInstance[0].element_key
    }),
    openPorts: extractOpenPort(params, params.elementInstance[0]),
    routing: extractRouting(params, params.elementInstance[0])
  };

  params.elementInstanceDetails = elementInstanceDetails;
  callback(null, params);
};

const updateConfigTracking = function(params, callback){
  if (params.isConfigChanged) {
    let changeTrackingProps = {
      fogInstanceId: 'elementInstance.iofog_uuid',
      changeObject: {
        containerConfig: new Date().getTime()
      }
    };
    ChangeTrackingService.updateChangeTracking(changeTrackingProps, params, callback);
  }else{
    callback(null, params);
  }
};

const updateElementInstanceConfig = function(params, callback){
  let updatedData = {};

  if (params.bodyParams.config) {
    updatedData.config = params.bodyParams.config;
    updatedData.configLastUpdated = new Date().getTime();
    params.isConfigChanged = true;
  }

  if (params.bodyParams.name) {
  updatedData.name = params.bodyParams.name
  }

  let updateElementInstanceProps ={
    elementId: 'bodyParams.elementId',
    updatedData: updatedData
  };

  ElementInstanceService.updateElemInstance(updateElementInstanceProps, params, callback);
};

const createSatellitePort = function(params, callback){
  let satellitePortProps = {
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
};

const updateElemInstance = function(params, callback) {
  let elementInstanceUpdateProps = {
      elementId: 'bodyParams.elementId',
      updatedData: {
        updatedBy: params.user.id,
        updatedAt: new Date().getTime()
      }
    };
  ElementInstanceService.updateElemInstance(elementInstanceUpdateProps, params, callback);
};

const getOutputDetails = function(params, callback) {
  params.output = {
    portId: params.elementInstancePort.id,
    internalPort: params.bodyParams.internalPort,
    externalPort: params.bodyParams.externalPort,
    networkPairingId: ''
  };

  if (params.bodyParams.publicAccess == 1) {
    params.output.accessUrl = "https://" + params.satellite.domain + ":" + params.satellitePort.port2;
    params.output.networkPairingId = params.networkPairingObj.id;
  }

  callback(null, params);
};

const listElementInstanceWithStatusEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },
        instanceProps = {
            instanceId: 'bodyParams.instanceId',
            setProperty: 'fogInstance'
        };

    params.bodyParams = req.body;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(UserService.getUser, userProps, params),
            async.apply(DataTracksService.findContainerListWithStatusByInstanceId, instanceProps, params)
        ],
        function (err, result) {
            AppUtils.sendResponse(res, err, 'list', params.fogInstance, result);
        });
};

export default {
  createElementInstanceConnectionEndPoint:createElementInstanceConnectionEndPoint,
  deleteElementInstanceConnectionEndPoint: deleteElementInstanceConnectionEndPoint,
  detailedElementInstanceCreateEndPoint: detailedElementInstanceCreateEndPoint,
  elementInstanceCreateEndPoint: elementInstanceCreateEndPoint,
  elementInstanceUpdateEndPoint: elementInstanceUpdateEndPoint,
  elementInstanceConfigUpdateEndPoint: elementInstanceConfigUpdateEndPoint,
  elementInstanceDeleteEndPoint: elementInstanceDeleteEndPoint,
  elementInstanceComsatPipeCreateEndPoint: elementInstanceComsatPipeCreateEndPoint,
  elementInstanceComsatPipeDeleteEndPoint: elementInstanceComsatPipeDeleteEndPoint,
  elementInstancePortCreateEndPoint: elementInstancePortCreateEndPoint,
  elementInstancePortDeleteEndPoint: elementInstancePortDeleteEndPoint,
  elementInstanceRebuildStatusEndPoint: elementInstanceRebuildStatusEndPoint,
  elementInstanceRebuildUpdateEndPoint: elementInstanceRebuildUpdateEndPoint,
  getElementInstanceDetailsEndPoint: getElementInstanceDetailsEndPoint,
  getElementInstancePropertiesEndPoint: getElementInstancePropertiesEndPoint,
    trackElementListEndPoint: trackElementListEndPoint,
    listElementInstanceWithStatusEndPoint: listElementInstanceWithStatusEndPoint
};