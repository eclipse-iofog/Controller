/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

/**
 * @file instanceRoutingController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-routing end-point
 */

const async = require('async');
const BaseApiController = require('./baseApiController');

const ChangeTrackingService = require('../../services/changeTrackingService');
const ComsatService = require('../../services/comsatService');
const DataTracksService = require('../../services/dataTracksService');
const ElementService = require('../../services/elementService');
const ElementInstanceService = require('../../services/elementInstanceService');
const FogService = require('../../services/fogService');
const FogTypeService = require('../../services/fogTypeService');
const NetworkPairingService = require('../../services/networkPairingService');
const RoutingService = require('../../services/routingService');
const SatelliteService = require('../../services/satelliteService');
const SatellitePortService = require('../../services/satellitePortService');
const ConsoleService = require('../../services/consoleService');
const StreamViewerService = require('../../services/streamViewerService');
const UserService = require('../../services/userService');

const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');
const Constants = require('../../constants.js');

/********************************************* EndPoints ******************************************************/

/********** Instance Routing EndPoint (Get/Post: /api/v2/instance/routing/id/:ID/token/:Token) ***************/
const instanceRoutingEndPoint = function (req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
      streamViewerProps = {
        instanceId: 'bodyParams.ID',
        setProperty: 'streamViewerData'
      },
      consoleProps = {
        instanceId: 'bodyParams.ID',
        setProperty: 'consoleData'
      },
      routingProps = { 
        instanceId: 'bodyParams.ID',
        setProperty: 'routingData'
      };

  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
    async.apply(StreamViewerService.getStreamViewerByFogInstanceId, streamViewerProps, params),
    async.apply(ConsoleService.getConsoleByFogInstanceId, consoleProps),
    async.apply(RoutingService.findByInstanceId, routingProps),
    getRouting
 ], function(err, result) {
    AppUtils.sendResponse(res, err, 'routing', params.containerList, result);
  });
};

/********* Instance Route Create EndPoint (Post: /api/v2/authoring/element/instance/route/create) **********/
const instanceRouteCreateEndPoint = function (req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
    currentTime = new Date().getTime(),
    watefallMethods = [],

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    pubFogProps = {
      fogId: 'bodyParams.publishingInstanceId',
      setProperty: 'publishingFogInstance'
    },

    destFogProps = {
      fogId: 'bodyParams.destinationInstanceId',
      setProperty: 'destinationFogInstance'
    },

    pubFogTypeProps = {
      fogTypeId: 'publishingFogInstance.typeKey',
      setProperty: 'pubFogType'
    },

    destFogTypeProps = {
      fogTypeId: 'destinationFogInstance.typeKey',
      setProperty: 'destFogType'
    },

    pubNetworkElementProps = {
      networkElementId: 'pubFogType.networkElementKey',
      setProperty: 'pubNetworkElement'
    },

    destNetworkElementProps = {
      networkElementId: 'destFogType.networkElementKey',
      setProperty: 'destNetworkElement'
    },

    networkPairingProps = {
      instanceId1: 'publishingFogInstance.uuid',
      instanceId2: 'destinationFogInstance.uuid',
      elementId1: 'bodyParams.publishingElementId',
      elementId2: 'bodyParams.destinationElementId',
      networkElementId1: 'pubNetworkElementInstance.uuid',
      networkElementId2: 'destNetworkElementInstance.uuid',
      isPublic: false,
      elementPortId: 'elementInstancePort.id',
      satellitePortId: 'satellitePort.id',
      setProperty: 'networkPairingObj'
    },

    routingProps = {
      publishingInstanceId: 'publishingFogInstance.uuid',
      destinationInstanceId: 'publishingFogInstance.uuid',
      publishingElementId: 'bodyParams.publishingElementId',
      destinationElementId: 'bodyParams.destinationElementId',
      isNetworkConnection: false,
      setProperty: 'route'
    },

    pubRoutingProps = {
      publishingInstanceId: 'publishingFogInstance.uuid',
      destinationInstanceId: 'publishingFogInstance.uuid',
      publishingElementId: 'bodyParams.publishingElementId',
      destinationElementId: 'pubNetworkElementInstance.uuid',
      isNetworkConnection: true,
      setProperty: 'publisingRoute'
    },

    destRoutingProps = {
      publishingInstanceId: 'destinationFogInstance.uuid',
      destinationInstanceId: 'destinationFogInstance.uuid',
      publishingElementId: 'destNetworkElementInstance.uuid',
      destinationElementId: 'bodyParams.destinationElementId',
      isNetworkConnection: true,
      setProperty: 'destinationRoute'
    },

    pubElementProps = {
      elementInstanceId: 'bodyParams.publishingElementId',
      setProperty: 'publishingElementInstance'
    },

    destElementProps = {
      elementInstanceId: 'bodyParams.destinationElementId',
      setProperty: 'destinationElementInstance'
    },

    pubChangeTrackingProps = {
      fogInstanceId: 'publishingFogInstance.uuid',
      changeObject: {
        'containerList': currentTime,
        'containerConfig': currentTime,
        'routing': currentTime
      }
    },

    destChangeTrackingProps = {
      fogInstanceId: 'destinationFogInstance.uuid',
      changeObject: {
        'containerList': currentTime,
        'containerConfig': currentTime,
        'routing': currentTime
      }
    },

    trackProps = {
      trackId: 'destinationElementInstance.trackId',
      setProperty: 'dataTrack'
    },

    updateRebuildPubProps = {
      elementId: 'bodyParams.publishingElementId',
      updatedData : {
        rebuild: 1
      }
    },
    updateRebuildDestProps = {
      elementId: 'bodyParams.destinationElementId',
      updatedData : {
        rebuild: 1
      }
    },
    pubTrackProps = {
      trackId: 'bodyParams.publishingTrackId',
      setProperty: 'publishingTrackData',
      errorMsg: 'publishingTrackId is either missing or invalid.'
    },
    destTrackProps = {
      trackId: 'bodyParams.destinationTrackId',
      setProperty: 'destinationTrackData',
      errorMsg: 'destinationTrackId is either missing or invalid.'
    },
    pubElementInstanceTrackProps ={
      trackId: 'publishingElementInstance.trackId',
      setProperty: 'pubElementInstanceTrack',
      errorMsg: 'publishingElementId has invalid trackId.'
    },
    destElementInstanceTrackProps = {
      trackId: 'destinationElementInstance.trackId',
      setProperty: 'destElementInstanceTrack',
      errorMsg: 'destinationElementId has invalid trackId.'
    };


  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  if (params.bodyParams.publishingInstanceId == params.bodyParams.destinationInstanceId) {
    watefallMethods = [
      async.apply(UserService.getUser, userProps, params),
      async.apply(FogService.getFogInstance, pubFogProps),
      async.apply(FogService.getFogInstance, destFogProps),
      async.apply(ElementInstanceService.getElementInstance, pubElementProps),
      async.apply(ElementInstanceService.getElementInstance, destElementProps),
      async.apply(DataTracksService.getDataTrackById, pubElementInstanceTrackProps),
      async.apply(DataTracksService.getDataTrackById, destElementInstanceTrackProps),
      async.apply(RoutingService.createRoute, routingProps),
      async.apply(ElementInstanceService.getElementInstanceRouteDetails, destElementProps),
      async.apply(ElementInstanceService.updateElemInstance, updateRebuildPubProps),
      async.apply(ElementInstanceService.updateElemInstance, updateRebuildDestProps),
      async.apply(ChangeTrackingService.updateChangeTracking, pubChangeTrackingProps),
      getRouteDetails
    ];
  } else {
    watefallMethods = [
      async.apply(UserService.getUser, userProps, params),

      async.apply(FogService.getFogInstance, pubFogProps),
      async.apply(FogService.getFogInstance, destFogProps),

      async.apply(FogTypeService.getFogTypeDetail, pubFogTypeProps),
      async.apply(FogTypeService.getFogTypeDetail, destFogTypeProps),

      async.apply(ElementInstanceService.getElementInstance, pubElementProps),
      async.apply(ElementInstanceService.getElementInstance, destElementProps),

      async.apply(DataTracksService.getDataTrackById, pubTrackProps),
      //async.apply(DataTracksService.getDataTrackById, destTrackProps),

      async.apply(DataTracksService.getDataTrackById, pubElementInstanceTrackProps),
      async.apply(DataTracksService.getDataTrackById, destElementInstanceTrackProps),

      ComsatService.openPortOnRandomComsat,
      createSatellitePort,

      async.apply(ElementService.getNetworkElement, pubNetworkElementProps),
      createPubNetworkElementInstance,

      async.apply(ElementService.getNetworkElement, destNetworkElementProps),
      createDestNetworkElementInstance,

      async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps),

      async.apply(RoutingService.createRoute, pubRoutingProps),
      async.apply(RoutingService.createRoute, destRoutingProps),

      async.apply(ElementInstanceService.updateElemInstance, updateRebuildPubProps),
      async.apply(ElementInstanceService.updateElemInstance, updateRebuildDestProps),

      async.apply(ChangeTrackingService.updateChangeTracking, pubChangeTrackingProps),
      async.apply(ChangeTrackingService.updateChangeTracking, destChangeTrackingProps),

      async.apply(DataTracksService.getDataTrackById, trackProps),

      getOutputDetails
    ];
  }

  async.waterfall(watefallMethods, function(err, result) {
    let errMsg = 'Internal error: There was a problem trying to create the ioElement Routing.' + result;

    AppUtils.sendResponse(res, err, 'route', params.output, errMsg);
  });
};

const createPubNetworkElementInstance = function (params, callback){
  let networkElementInstanceProps = {
      networkElement: 'pubNetworkElement',
      fogInstanceId: 'publishingFogInstance.uuid',
      satellitePort: 'satellitePort.port1',
      satelliteDomain: 'satellite.domain',
      satelliteCertificate: 'satellite.cert',
      passcode: 'comsatPort.passcode1',
      trackId: 'bodyParams.publishingTrackId',
      userId: 'user.id',
      networkName: 'Network for Element '+ params.bodyParams.publishingElementId,
      networkPort: 0,
      isPublic: false,
      setProperty: 'pubNetworkElementInstance'
    };

  ElementInstanceService.createNetworkElementInstance(networkElementInstanceProps, params, callback);
}

const createDestNetworkElementInstance = function (params, callback){
  let networkElementInstanceProps = {
      networkElement: 'destNetworkElement',
      fogInstanceId: 'destinationFogInstance.uuid',
      satellitePort: 'satellitePort.port2',
      satelliteDomain: 'satellite.domain',
      satelliteCertificate: 'satellite.cert',
      passcode: 'comsatPort.passcode2',
      trackId: 'bodyParams.publishingTrackId',
      userId: 'user.id',
      networkName: 'Network for Element '+ params.bodyParams.destinationElementId,
      networkPort: 0,
      isPublic: false,
      setProperty: 'destNetworkElementInstance'
    };

  ElementInstanceService.createNetworkElementInstance(networkElementInstanceProps, params, callback);
}


/********* Instance Route Delete EndPoint (Post: /api/v2/authoring/element/instance/route/delete) **********/
const instanceRouteDeleteEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
    currentTime = new Date().getTime(),
    watefallMethods = [],

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    pubFogProps = {
      fogId: 'bodyParams.publishingInstanceId',
      setProperty: 'publishingFogInstance'
    },

    destFogProps = {
      fogId: 'bodyParams.destinationInstanceId',
      setProperty: 'destinationFogInstance'
    },

    deleteRouteProps = {
      instanceId1: 'bodyParams.publishingInstanceId',
      instanceId2: 'bodyParams.destinationInstanceId',
      elementId1: 'bodyParams.publishingElementId',
      elementId2: 'bodyParams.destinationElementId',
      isNetwork: false
    },

    networkPairingProps = {
      instanceId1: 'bodyParams.publishingInstanceId',
      instanceId2: 'bodyParams.destinationInstanceId',
      elementId1: 'bodyParams.publishingElementId',
      elementId2: 'bodyParams.destinationElementId',
      setProperty: 'networkPairing'
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

    deletePubRouteProps = {
      instanceId1: 'bodyParams.publishingInstanceId',
      instanceId2: 'bodyParams.publishingInstanceId',
      elementId1: 'bodyParams.publishingElementId',
      elementId2: 'networkPairing.networkElementId1',
      isNetwork: true
    },

    deleteDestRouteProps = {
      instanceId1: 'bodyParams.destinationInstanceId',
      instanceId2: 'bodyParams.destinationInstanceId',
      elementId1: 'networkPairing.networkElementId2',
      elementId2: 'bodyParams.destinationElementId',
      isNetwork: true
    },

    deleteNWElement1Props = {
      elementId: 'networkPairing.networkElementId1'
    },

    deleteNWElement2Props = {
      elementId: 'networkPairing.networkElementId2'
    },

    delNetworkPairingProps = {
      networkPairingId: 'networkPairing.id'
    },

    pubChangeTrackingProps = {
      fogInstanceId: 'bodyParams.publishingInstanceId',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime(),
        'routing': new Date().getTime()
      }
    },

    destChangeTrackingProps = {
      fogInstanceId: 'bodyParams.destinationInstanceId',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime(),
        'routing': new Date().getTime()
      }
    },
    changeTrackingProps = {
      fogInstanceId: 'bodyParams.destinationInstanceId',
      changeObject: {
        'routing': new Date().getTime()
      }
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  if (params.bodyParams.isNetworkConnection == 0) {
    watefallMethods = [
      async.apply(UserService.getUser, userProps, params),
      async.apply(RoutingService.deleteByFogAndElement, deleteRouteProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
      getDeleteOutput
    ];
  } else {
    watefallMethods = [
      async.apply(UserService.getUser, userProps, params),

      async.apply(FogService.getFogInstance, pubFogProps),
      async.apply(FogService.getFogInstance, destFogProps),

      async.apply(NetworkPairingService.getNetworkPairingByFogAndElement, networkPairingProps),

      async.apply(SatellitePortService.getSatellitePort, satellitePortProps),
      async.apply(SatelliteService.getSatelliteById, satelliteProps),
      ComsatService.closePortOnComsat,

      async.apply(SatellitePortService.deleteSatellitePort, deleteSatelliteProps),

      async.apply(RoutingService.deleteByFogAndElement, deletePubRouteProps),
      async.apply(RoutingService.deleteByFogAndElement, deleteDestRouteProps),

      async.apply(ElementInstanceService.deleteElementInstance, deleteNWElement1Props),
      async.apply(ElementInstanceService.deleteElementInstance, deleteNWElement2Props),

      async.apply(NetworkPairingService.deleteNetworkPairingById, delNetworkPairingProps),

      async.apply(ChangeTrackingService.updateChangeTracking, pubChangeTrackingProps),
      async.apply(ChangeTrackingService.updateChangeTracking, destChangeTrackingProps),

      getDeleteOutput
    ];
  }

  async.waterfall(watefallMethods, function(err, result) {
    let errMsg = 'Internal error: There was a problem trying to delete the ioElement Routing.' + result;

    AppUtils.sendResponse(res, err, 'route', params.output, errMsg);
  });
};

/************************************* Extra Functions **************************************************/
  const getRouting = function (params, callback) {
  try{
    let containerList = [];
    for (let i = 0; i < params.routingData.length; i++) {
      let container = params.routingData[i],
          containerID = container.publishing_element_id,
          destinationElementID = container.destination_element_id,
          foundIt = false;

      params.container = container;

      for (let j = 0; j < containerList.length; j++) {
        let curItem = containerList[j],
            curID = curItem.container;

        if (curID == containerID) {
          foundIt = true;
          let outElementLabel = destinationElementID;
          if(params.streamViewerData){
            if (destinationElementID == params.streamViewerData.element_id) {
              outElementLabel = "viewer";
            }
          }
          if(params.consoleData){
            if (destinationElementID == params.consoleData.elementId) {
              outElementLabel = "debug";
            }
          }
            containerList[j]["receivers"].push(outElementLabel);
        }
      }
      if (foundIt == false) {
        let tmpNewContainerItem = {},
            receiverList = new Array(),
            outElementLabel = destinationElementID;
              
            tmpNewContainerItem.container = containerID;
        if(params.streamViewerData){
          if (destinationElementID ==  params.streamViewerData.element_id) {
            outElementLabel = "viewer";
          }
        }
        if (params.consoleData){
          if (destinationElementID == params.consoleData.elementId) {
            outElementLabel = "debug";
          }
        }
        
        receiverList.push(outElementLabel);

        tmpNewContainerItem.receivers = receiverList;
        containerList.push(tmpNewContainerItem);
      }
    }
    params.containerList = containerList;
    callback(null, params);
  }catch(e){
    logger.error(e);
  }
}

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
}


const getRouteDetails = function(params, callback) {
  params.output = {
    elementId: params.bodyParams.destinationElementId,
    elementName: params.destinationElementInstance[0].elementInstanceName,
    elementTypeName: params.destinationElementInstance[0].elementName,
    trackId: params.destinationElementInstance[0].trackId,
    trackName: params.destinationElementInstance[0].trackName,
    instanceId: params.destinationFogInstance.uuid,
    instanceName: params.destinationFogInstance.name
  };

 if(params.bodyParams.publishingInstanceId != params.bodyParams.destinationInstanceId){
  }else if(params.bodyParams.publishingTrackId != params.bodyParams.destinationTrackId){
    params.output.instanceId = '';
    params.output.instanceName = '';
  }else{
    params.output.instanceId = '';
    params.output.instanceName = '';
    params.output.trackId = '';
    params.output.trackName = '';
  }

  callback(null, params);
}

const getOutputDetails = function(params, callback) {
  params.output = {
    elementId: params.bodyParams.destinationElementId,
    elementName: params.destinationElementInstance.name,
    elementTypeName: params.destinationElementInstance.typeKey,
    trackId: params.destinationElementInstance.trackId,
    trackName: params.dataTrack.name,
    instanceId: params.destinationFogInstance.uuid,
    instanceName: params.destinationFogInstance.name
  };

  if(params.bodyParams.publishingInstanceId != params.bodyParams.destinationInstanceId){
  }else if(params.bodyParams.publishingTrackId != params.bodyParams.destinationTrackId){
    params.output.instanceId = '';
    params.output.instanceName = '';
  }else{
    params.output.instanceId = '';
    params.output.instanceName = '';
    params.output.trackId = '';
    params.output.trackName = '';
  }

  callback(null, params);
}

const getDeleteOutput = function(params, callback) {
  params.output = {
    publishinginstanceid: params.bodyParams.publishingInstanceId,
    publishingtrackid: params.bodyParams.publishingTrackId,
    publishingelementid: params.bodyParams.publishingElementId,
    destinationinstanceid: params.bodyParams.destinationInstanceId,
    destinationtrackid: params.bodyParams.destinationTrackId,
    destinationelementid: params.bodyParams.destinationElementId
  };

  callback(null, params);
}

module.exports =  {
  instanceRoutingEndPoint: instanceRoutingEndPoint,
  instanceRouteCreateEndPoint: instanceRouteCreateEndPoint,
  instanceRouteDeleteEndPoint: instanceRouteDeleteEndPoint
};