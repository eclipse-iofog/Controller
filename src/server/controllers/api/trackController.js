/**
 * @file trackController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the status end-point
 */
import async from 'async';
import express from 'express';
const router = express.Router();

import ChangeTrackingService from '../../services/changeTrackingService';
import ComsatService from '../../services/comsatService';
import DataTracksService from '../../services/dataTracksService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ElementInstanceService from '../../services/elementInstanceService';
import FabricService from '../../services/fabricService';
import NetworkPairingService from '../../services/networkPairingService';
import RoutingService from '../../services/routingService';
import SatellitePortService from '../../services/satellitePortService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';


router.get('/api/v2/authoring/fabric/track/list/:instanceId', (req, res) => {
var params = {},

    userProps = {
      userId: 'bodyParams.userId',
      setProperty: 'user'
    },

    fogInstanceProps = {
      fogId: 'bodyParams.instanceId',
      setProperty: 'fogData'
    },
    
    dataTrackProps = {
      instanceId: 'bodyParams.instanceId',
      setProperty: 'dataTracks'
    };

  params.bodyParams = req.params;
  params.bodyParams.userId = req.query.userId;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FabricService.getFogInstance, fogInstanceProps),
    async.apply(DataTracksService.getDataTrackByInstanceId, dataTrackProps)
  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'tracks', params.dataTracks, result);
  })
});

router.post('/api/v2/authoring/user/track/update', (req, res) => {
var params = {},

    userProps = {
      userId: 'bodyParams.userId',
      setProperty: 'user'
    },
    
    dataTrackProps = {
      trackId: 'bodyParams.trackId',
      setProperty: 'dataTrack'
    };

  params.bodyParams = req.body;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(DataTracksService.getDataTrackById, dataTrackProps),
    resetSelectedActivatedAndName,
    findElementInstanceByTrackId,
    updateChangeTracking,
    updateDataTrackById

  ], function(err, result) {
    var trackId;

    if (params.bodyParams){
      trackId = params.bodyParams.trackId;
    }

    AppUtils.sendResponse(res, err, 'trackId', trackId, result);
  })
});

const resetSelectedActivatedAndName= function(params, callback) {

  if (params.bodyParams.isSelected == -1)
    params.bodyParams.isSelected = params.dataTrack.isSelected;

  if (params.bodyParams.isActivated == -1)
    params.bodyParams.isActivated = params.dataTrack.isActivated;

  if (!params.bodyParams.name)
    params.bodyParams.name = params.dataTrack.name;

  callback(null, params);
}

const findElementInstanceByTrackId= function(params, callback) {
    var elementInstanceProps = {
          trackId: 'bodyParams.trackId',
          setProperty: 'elementInstances'
        };
    
  if (params.bodyParams.isActivated != params.dataTrack.isActivated) {
    ElementInstanceService.findElementInstancesByTrackId(elementInstanceProps, params, callback);
  }
  else{
    callback(null, params);
  }
}

const updateChangeTracking= function(params, callback) {
  var changeTrackingProps = {};
        
  if (params.elementInstances){
    for(var i = 0; i < params.elementInstances.length; i++){
        changeTrackingProps = {
          fogInstanceId: 'elementInstances['+i+'].iofabric_uuid',
          changeObject: {
            containerConfig: new Date().getTime(),
            containerList: new Date().getTime()
          }
        };
      ChangeTrackingService.updateChangeTrackingData(changeTrackingProps, params);
    }
    callback(null, params);
  }
  else{
    callback(null, params);
  }
}

const updateDataTrackById= function(params, callback) {
  var updateDataTrackProps = {
        trackId: 'bodyParams.trackId',
        updatedObj: {
          name: params.bodyParams.name,
          description: '',
          lastUpdated : new Date(),
          isSelected: params.bodyParams.isSelected,
          isActivated: params.bodyParams.isActivated,
          user_id: params.user.id
      }
    };
  DataTracksService.updateDataTrackById(updateDataTrackProps, params, callback);
}

router.post('/api/v2/authoring/fabric/track/update', (req, res) => {
var params = {},

    userProps = {
      userId: 'bodyParams.userId',
      setProperty: 'user'
    },

    dataTrackProps = {
      trackId: 'bodyParams.trackId',
      setProperty: 'dataTrack'
    };

  params.bodyParams = req.body;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(DataTracksService.getDataTrackById, dataTrackProps),
    getFogInstance,
    updateDataTrackById

  ], function(err, result) {
    var trackId;

    if (params.bodyParams){
      trackId = params.bodyParams.trackId;
    }

    AppUtils.sendResponse(res, err, 'trackId', params.bodyParams.trackId, result);
  })
});

const getFogInstance = function(params, callback) {
    if (!params.bodyParams.instanceId){
      params.bodyParams.instanceId = params.dataTrack.instanceId;
    }
   var fogInstanceProps = {
      fogId: 'bodyParams.instanceId',
      setProperty: 'fogData'
    };
  FabricService.getFogInstance(fogInstanceProps, params, callback)
}

router.post('/api/v2/authoring/fabric/track/delete', (req, res) => {
  var params = {},

    userProps = {
      userId: 'bodyParams.userId',
      setProperty: 'user'
    },

    dataTrackProps = {
      trackId: 'bodyParams.trackId',
      setProperty: 'dataTrack'
    };
  params.bodyParams = req.body;

  async.waterfall([
    async.apply(UserService.getUser,userProps, params),
    async.apply(DataTracksService.getDataTrackById, dataTrackProps),
    ElementInstanceService.getElementInstancesByTrackId,
    deleteElementInstances,
    DataTracksService.deleteTrackById
  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem deleting the track : ' + result

    AppUtils.sendResponse(res, err, 'trackId', params.bodyParams.trackId, errMsg);
  });
});

function deleteElementInstances(params, callback) {
  console.log();
  if (params.trackElementInstances && params.trackElementInstances.length > 0) {
    async.eachSeries(params.trackElementInstances, function(elementInstance, callback) {
      params.bodyParams.elementId = elementInstance.uuid;
      deleteElement(params, callback);
    }, function(err) {
      params.errormessage = JSON.stringify(err);
      callback(null, params);
    });
  } else {
    callback(null, params);
  }
}

function deleteElement(params, callback) {
  var deleteElementProps = {
    elementId: 'bodyParams.elementId'
  };

  async.waterfall([
    async.apply(ElementInstancePortService.deleteElementInstancePort, params),
    RoutingService.deleteElementInstanceRouting,
    RoutingService.deleteNetworkElementRouting,
    ElementInstanceService.deleteNetworkElementInstance,
    SatellitePortService.getPasscodeForNetworkElements,
    ComsatService.closePortsOnComsat,
    NetworkPairingService.deleteNetworkPairing,
    SatellitePortService.deletePortsForNetworkElements,
    async.apply(ElementInstanceService.deleteElementInstance, deleteElementProps)
  ], function(err, result) {
    console.log(err);
    callback();
  });
}

export default router;