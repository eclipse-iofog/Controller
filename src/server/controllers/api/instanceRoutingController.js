/**
 * @file instanceRoutingController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-routing end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import BaseApiController from './baseApiController';

import ChangeTrackingService from '../../services/changeTrackingService';
import ComsatService from '../../services/comsatService';
import DataTracksService from '../../services/dataTracksService';
import ElementService from '../../services/elementService';
import ElementInstanceService from '../../services/elementInstanceService';
import FabricService from '../../services/fabricService';
import FabricTypeService from '../../services/fabricTypeService';
import NetworkPairingService from '../../services/networkPairingService';
import RoutingService from '../../services/routingService';
import SatelliteService from '../../services/satelliteService';
import SatellitePortService from '../../services/satellitePortService';
import UserService from '../../services/userService';

import StreamViewerManager from '../../managers/streamViewerManager';
import FabricManager from '../../managers/fabricManager';
import ConsoleManager from '../../managers/consoleManager';
import RoutingManager from '../../managers/routingManager';

import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

router.get('/api/v2/instance/routing/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  var milliseconds = new Date().getTime(),
    instanceId = req.params.ID,
    token = req.params.Token,
    streamId = "",
    consoleId = "",
    containerList = [];
  /**
   * @desc - async.waterfall control flow, sequential calling of an Array of functions.
   * @param Array - [getStreamViewer, getConsole, getRouting]
   * @return - returns an appropriate response to the client
   */
  async.waterfall([
    async.apply(getStreamViewer, instanceId, streamId, consoleId, containerList),
    getConsole,
    getRouting
  ], function(err, result) {
    if (err) {
      res.send({
        'status': 'failure',
        'timestamp': new Date().getTime(),
        'errormessage': result
      });
    } else {
      res.status(200);
      res.send({
        'status': 'ok',
        'timestamp': new Date().getTime(),
        'routing': result
      });
    }
  });
});

/**
 * @desc - if the streamViewer exists in the database, assigns the streamId and forwards to getConsole function
 * @param - instanceId, streamId, consoleId, containerList, callback
 * @return - none
 */
function getStreamViewer(instanceId, streamId, consoleId, containerList, callback) {
  StreamViewerManager.findByInstanceId(instanceId)
    .then((streamData) => {
        if (streamData) {
          streamId = streamData.elementId;
          callback(null, instanceId, streamId, consoleId, containerList);
        } else callback('error', Constants.MSG.ERROR_STREAMVIEWER_UNKNOWN);
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}
/**
 * @desc - if the console exists in the database, assigns the consoleId and forwards to getRouting function
 * @param - instanceId, streamId, consoleId, containerList, callback
 * @return - none
 */
function getConsole(instanceId, streamId, consoleId, containerList, callback) {
  ConsoleManager.findByInstanceId(instanceId)
    .then((consoleData) => {
        if (consoleData) {
          consoleId = consoleData.elementId;
          callback(null, instanceId, streamId, consoleId, containerList);
        } else callback('error', Constants.MSG.ERROR_CONSOLE_UNKNOWN);
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}
/**
 * @desc - if the routing exists in the database, this function populates the containerList
 * with list of containers with there respective list of recievers
 * @param - instanceId, streamId, consoleId, containerList, callback
 * @return - none
 */
function getRouting(instanceId, streamId, consoleId, containerList, callback) {
  RoutingManager.findByInstanceId(instanceId)
    .then((routingData) => {
        if (routingData) {
          var routingList = routingData;
          for (let i = 0; i < routingList.length; i++) {
            var container = routingList[i],
              containerID = container.publishingElementId,
              destinationInstanceID = container.destinationInstanceId,
              destinationElementID = container.destinationElementId,
              foundIt = false;
            for (var j = 0; j < containerList.length; j++) {
              var curItem = containerList[j];
              var curID = curItem.container;

              if (curID == containerID) {
                foundIt = true;
                var outElementLabel = destinationElementID;
                if (destinationElementID == streamId) {
                  outElementLabel = "viewer";
                }
                if (destinationElementID == consoleId) {
                  outElementLabel = "debug";
                }

                containerList[j]["receivers"].push(outElementLabel);
              }
            }
            if (foundIt == false) {
              var tmpNewContainerItem = {
                container: containerID
              };
              var receiverList = new Array();
              var outElementLabel = destinationElementID;
              if (destinationElementID == streamId) {
                outElementLabel = "viewer";
              }
              if (destinationElementID == consoleId) {
                outElementLabel = "debug";
              }
              receiverList.push(outElementLabel);
              tmpNewContainerItem.receivers = receiverList;
              containerList.push(tmpNewContainerItem);
            }
          }
          callback(null, containerList);
        } else callback('error', Constants.MSG.ERROR_ROUTING_UNKNOWN);
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

router.post('/api/v2/authoring/element/instance/route/create', (req, res) => {
  var params = {},
    currentTime = new Date().getTime(),
    watefallMethods = [],

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

    pubNetworkInstanceProps = {
      networkElement: 'pubNetworkElement',
      fogInstanceId: 'publishingFogInstance.uuid',
      satellitePort: 'satellitePort.port1',
      satelliteDomain: 'satellite.domain',
      trackId: 'bodyParams.publishingTrackId',
      userId: 'userId',
      networkName: null,
      networkPort: 0,
      isPublic: false,
      setProperty: 'pubNetworkElementInstance'
    },

    destElementProps = {
      elementInstanceId: 'bodyParams.destinationElementId',
      setProperty: 'destinationElementInstance'
    },

    destNetworkInstanceProps = {
      networkElement: 'destNetworkElement',
      fogInstanceId: 'destinationFogInstance.uuid',
      satellitePort: 'satellitePort.port1',
      satelliteDomain: 'satellite.domain',
      trackId: 'bodyParams.publishingTrackId',
      userId: 'userId',
      networkName: null,
      networkPort: 0,
      isPublic: false,
      setProperty: 'destNetworkElementInstance'
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
    };

  params.bodyParams = req.body;

  if (params.bodyParams.publishingInstanceId == params.bodyParams.destinationInstanceId) {
    watefallMethods = [
      async.apply(UserService.getUser, params),

      async.apply(FabricService.getFogInstance, pubFogProps),
      async.apply(FabricService.getFogInstance, destFogProps),

      async.apply(ElementInstanceService.getElementInstance, destElementProps),

      async.apply(RoutingService.createRoute, routingProps),

      async.apply(ElementInstanceService.updateRebuild, pubElementProps),
      async.apply(ElementInstanceService.updateRebuild, destElementProps),

      async.apply(ChangeTrackingService.updateChangeTracking, pubChangeTrackingProps),

      async.apply(DataTracksService.getDataTrackById, trackProps),

      getOutputDetails
    ];
  } else {
    watefallMethods = [
      async.apply(UserService.getUser, params),

      async.apply(FabricService.getFogInstance, pubFogProps),
      async.apply(FabricService.getFogInstance, destFogProps),

      async.apply(FabricTypeService.getFabricTypeDetail, pubFogTypeProps),
      async.apply(FabricTypeService.getFabricTypeDetail, destFogTypeProps),

      async.apply(ElementInstanceService.getElementInstance, pubElementProps),
      async.apply(ElementInstanceService.getElementInstance, destElementProps),

      ComsatService.openPortOnRadomComsat,
      SatellitePortService.createSatellitePort,

      async.apply(ElementService.getNetworkElement, pubNetworkElementProps),
      async.apply(ElementInstanceService.createNetworkElementInstance, pubNetworkInstanceProps),

      async.apply(ElementService.getNetworkElement, destNetworkElementProps),
      async.apply(ElementInstanceService.createNetworkElementInstance, destNetworkInstanceProps),

      async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps),

      async.apply(RoutingService.createRoute, pubRoutingProps),
      async.apply(RoutingService.createRoute, destRoutingProps),

      async.apply(ElementInstanceService.updateRebuild, pubElementProps),
      async.apply(ElementInstanceService.updateRebuild, destElementProps),

      async.apply(ChangeTrackingService.updateChangeTracking, pubChangeTrackingProps),
      async.apply(ChangeTrackingService.updateChangeTracking, destChangeTrackingProps),

      async.apply(DataTracksService.getDataTrackById, trackProps),

      getOutputDetails
    ];
  }

  async.waterfall(watefallMethods, function(err, result) {
    var errMsg = 'Internal error: There was a problem trying to create the ioElement Routing.' + result;

    AppUtils.sendResponse(res, err, 'route', params.output, errMsg);
  });
});

function getOutputDetails(params, callback) {
  params.output = {
    elementId: params.bodyParams.destinationElementId,
    elementName: params.destinationElementInstance.name,
    elementTypeName: params.destinationElementInstance.typeKey,
    trackId: params.destinationElementInstance.trackId,
    trackName: params.dataTrack.name,
    instanceId: params.destinationFogInstance.uuid,
    instanceName: params.destinationFogInstance.name
  };

  callback(null, params);
}

router.post('/api/v2/authoring/element/instance/route/delete', (req, res) => {
  var params = {},
    currentTime = new Date().getTime(),
    watefallMethods = [],

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
      instanceId2: 'bodyParams.publishingInstanceId',
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
        'Routing': new Date().getTime()
      }
    },

    destChangeTrackingProps = {
      fogInstanceId: 'bodyParams.destinationInstanceId',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime(),
        'Routing': new Date().getTime()
      }
    };

  params.bodyParams = req.body;

  if (params.bodyParams.isNetworkConnection == 0) {
    watefallMethods = [
      async.apply(UserService.getUser, params),
      async.apply(RoutingService.deleteByFogAndElement, deleteRouteProps),
      getDeleteOutput
    ];
  } else {
    watefallMethods = [
      async.apply(UserService.getUser, params),

      async.apply(FabricService.getFogInstance, pubFogProps),
      async.apply(FabricService.getFogInstance, destFogProps),

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
    var errMsg = 'Internal error: There was a problem trying to delete the ioElement Routing.' + result;

    AppUtils.sendResponse(res, err, 'route', params.output, errMsg);
  });
});

function getDeleteOutput(params, callback) {
  params.output = {
    publishinginstanceid: params.bodyParams.publishingInstanceId,
    publishingtrackid: params.bodyParams.publishingTrackId,
    publishingelementid: params.publishingElementInstanceId,
    destinationinstanceid: params.bodyParams.destinationInstanceId,
    destinationtrackid: params.bodyParams.destinationTrackId,
    destinationelementid: params.bodyParams.destinationElementId
  };

  callback(null, params);
}

export default router;